// sync-meta — puxa investimento diário por criativo do Meta Ads → public.meta_insights
//
// Usa o "async insights report" do Meta (POST -> poll -> GET), que é bem mais
// leve no rate limit do que paginar /insights direto. Sem o campo `actions`
// (os leads/MQL vêm da planilha, não do Meta).
//
// Secrets (Lovable Cloud):
//   META_ACCESS_TOKEN    — token de longa duração com ads_read
//   META_AD_ACCOUNT_IDS  — "act_123,act_456" (aceita só os números)
//   META_API_VERSION     — opcional, default abaixo
//   META_DATE_PRESET     — opcional, default "last_30d" (ex "last_90d")
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { corsHeaders, json } from "../_shared/cors.ts";

const DEFAULT_VERSION = "v23.0";
const DEFAULT_DATE_PRESET = "last_30d";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Insight = {
  date_start?: string;
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
};

function metaError(body: unknown, status: number): string {
  const err = (body as { error?: Record<string, unknown> })?.error;
  if (!err) return `Meta API HTTP ${status}: ${JSON.stringify(body).slice(0, 300)}`;
  return [
    err["message"],
    err["error_user_title"],
    err["error_user_msg"],
    err["code"] !== undefined ? `code ${err["code"]}` : null,
    err["error_subcode"] !== undefined ? `subcode ${err["error_subcode"]}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

const isRateLimit = (msg: string) =>
  /request limit|rate limit|reduce the amount of data|too many calls|user request limit|code 4\b|code 17\b|code 80000/i.test(
    msg,
  );

/** fetch + JSON com retry/backoff quando o Meta reclama de rate limit. */
async function metaFetch(
  url: string,
  init: RequestInit,
  tries = 3,
): Promise<Record<string, unknown>> {
  let lastErr = "";
  for (let attempt = 0; attempt < tries; attempt++) {
    const res = await fetch(url, init);
    const raw = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new Error(`Resposta não-JSON do Meta (HTTP ${res.status}): ${raw.slice(0, 300)}`);
    }
    if (res.ok) return body as Record<string, unknown>;

    lastErr = metaError(body, res.status);
    if (!isRateLimit(lastErr) || attempt === tries - 1) throw new Error(lastErr);
    await sleep((attempt + 1) * 15000); // 15s, 30s
  }
  throw new Error(lastErr);
}

async function pullAccount(
  API: string,
  auth: HeadersInit,
  account: string,
  datePreset: string,
): Promise<Insight[]> {
  const startParams = new URLSearchParams({
    level: "ad",
    time_increment: "1",
    date_preset: datePreset,
    fields: "campaign_name,adset_name,ad_name,spend,impressions,clicks",
  });

  const start = await metaFetch(
    `${API}/${account}/insights?${startParams.toString()}`,
    { method: "POST", headers: auth },
  );
  const runId = start["report_run_id"] as string | undefined;
  if (!runId) throw new Error(`Meta não retornou report_run_id para ${account}`);

  // poll (até ~2,5 min)
  for (let i = 0; i < 75; i++) {
    await sleep(2000);
    const poll = await metaFetch(
      `${API}/${runId}?fields=async_status,async_percent_completion`,
      { headers: auth },
    );
    const st = poll["async_status"];
    if (st === "Job Completed") break;
    if (st === "Job Failed" || st === "Job Skipped") {
      throw new Error(`Relatório do Meta falhou (${st}) para ${account}`);
    }
    if (i === 74) throw new Error(`Relatório do Meta não concluiu a tempo para ${account}`);
  }

  const rows: Insight[] = [];
  let next: string | null = `${API}/${runId}/insights?limit=500`;
  let guard = 0;
  while (next && guard++ < 100) {
    const body = await metaFetch(next, { headers: auth });
    rows.push(...((body["data"] as Insight[]) ?? []));
    next = ((body["paging"] as { next?: string })?.next) ?? null;
  }
  return rows;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  await supabase.from("sync_status").upsert({
    source: "meta",
    status: "running",
    last_run_at: new Date().toISOString(),
    message: null,
  });

  const version = Deno.env.get("META_API_VERSION") || DEFAULT_VERSION;
  const datePreset = Deno.env.get("META_DATE_PRESET") || DEFAULT_DATE_PRESET;
  const API = `https://graph.facebook.com/${version}`;
  const debug: Record<string, unknown> = { version, datePreset };

  try {
    const token = Deno.env.get("META_ACCESS_TOKEN");
    const accountsRaw = Deno.env.get("META_AD_ACCOUNT_IDS");
    if (!token || !accountsRaw) {
      throw new Error(
        "META_ACCESS_TOKEN e/ou META_AD_ACCOUNT_IDS não configurados. Cadastre como secrets no Lovable Cloud.",
      );
    }
    const accounts = accountsRaw
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean)
      .map((a) => (a.startsWith("act_") ? a : `act_${a}`));
    debug.accounts = accounts;

    const auth = { Authorization: `Bearer ${token}` };
    const records: Record<string, unknown>[] = [];

    for (const account of accounts) {
      const rows = await pullAccount(API, auth, account, datePreset);
      for (const row of rows) {
        if (!row.date_start) continue;
        const id = await sha256(
          [row.date_start, account, row.campaign_name, row.adset_name, row.ad_name].join("|"),
        );
        records.push({
          id,
          insight_date: row.date_start,
          account_id: account,
          campanha: row.campaign_name ?? null,
          conjunto: row.adset_name ?? null,
          criativo: row.ad_name ?? null,
          spend: Number(row.spend ?? 0),
          impressions: Number(row.impressions ?? 0),
          clicks: Number(row.clicks ?? 0),
          leads: 0,
          synced_at: new Date().toISOString(),
        });
      }
      await sleep(1500); // respiro entre contas
    }

    // agrega ids repetidos (evita "ON CONFLICT ... cannot affect row a second time")
    const byId = new Map<string, Record<string, unknown>>();
    for (const rec of records) {
      const key = rec.id as string;
      const prev = byId.get(key);
      if (!prev) {
        byId.set(key, rec);
        continue;
      }
      for (const f of ["spend", "impressions", "clicks", "leads"]) {
        prev[f] = Number(prev[f] ?? 0) + Number(rec[f] ?? 0);
      }
    }
    const unique = [...byId.values()];

    for (let i = 0; i < unique.length; i += 500) {
      const { error } = await supabase
        .from("meta_insights")
        .upsert(unique.slice(i, i + 500), { onConflict: "id" });
      if (error) throw error;
    }

    await supabase.from("sync_status").upsert({
      source: "meta",
      status: "ok",
      last_run_at: new Date().toISOString(),
      rows: unique.length,
      message: `${unique.length} linhas · ${datePreset} · ${version}`,
    });
    return json({ ok: true, rows: unique.length, ...debug });
  } catch (e) {
    const message = e instanceof Error ? e.message : JSON.stringify(e);
    await supabase.from("sync_status").upsert({
      source: "meta",
      status: "error",
      last_run_at: new Date().toISOString(),
      message,
    });
    return json({ ok: false, error: message, ...debug }, 500);
  }
});
