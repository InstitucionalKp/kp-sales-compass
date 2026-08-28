// sync-meta — puxa investimento diário por criativo do Meta Ads → public.meta_insights
//
// Secrets (cadastrar no Lovable Cloud):
//   META_ACCESS_TOKEN    — token de longa duração com permissão ads_read
//   META_AD_ACCOUNT_IDS  — "act_123,act_456" (aceita só os números também)
//   META_API_VERSION     — opcional, ex "v23.0" (default abaixo)
//   META_DATE_PRESET     — opcional, ex "last_90d" (default "last_30d")
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { corsHeaders, json } from "../_shared/cors.ts";

const DEFAULT_VERSION = "v23.0";
const DEFAULT_DATE_PRESET = "last_30d";

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Insight = {
  date_start: string;
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: { action_type: string; value: string }[];
};

function metaError(body: unknown, status: number): string {
  const err = (body as { error?: Record<string, unknown> })?.error;
  if (!err) return `Meta API HTTP ${status}: ${JSON.stringify(body).slice(0, 300)}`;
  const parts = [
    err["message"],
    err["error_user_title"],
    err["error_user_msg"],
    err["code"] !== undefined ? `code ${err["code"]}` : null,
    err["error_subcode"] !== undefined ? `subcode ${err["error_subcode"]}` : null,
    err["type"] ? `(${err["type"]})` : null,
  ].filter(Boolean);
  return parts.join(" · ");
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
    const leadTypes = new Set([
      "lead",
      "onsite_conversion.lead_grouped",
      "offsite_conversion.fb_pixel_lead",
    ]);

    const records: Record<string, unknown>[] = [];

    for (const account of accounts) {
      const params = new URLSearchParams({
        level: "ad",
        time_increment: "1",
        date_preset: datePreset,
        fields: "campaign_name,adset_name,ad_name,spend,impressions,clicks,actions",
        limit: "500",
      });
      let next: string | null = `${API}/${account}/insights?${params.toString()}`;

      let guard = 0;
      while (next && guard++ < 50) {
        const res = await fetch(next, { headers: auth });
        const raw = await res.text();
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          throw new Error(`Resposta não-JSON do Meta (HTTP ${res.status}): ${raw.slice(0, 300)}`);
        }
        if (!res.ok) throw new Error(metaError(body, res.status));

        const data = (body as { data?: Insight[] }).data ?? [];
        for (const row of data) {
          const leads = (row.actions ?? [])
            .filter((a) => leadTypes.has(a.action_type))
            .reduce((s, a) => s + Number(a.value || 0), 0);
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
            leads,
            synced_at: new Date().toISOString(),
          });
        }
        next = (body as { paging?: { next?: string } }).paging?.next ?? null;
      }
    }

    // Agrega linhas com o mesmo id (mesma data/conta/campanha/conjunto/criativo),
    // senão o upsert falha com "ON CONFLICT DO UPDATE cannot affect row a second time".
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
    const err = e as { message?: string; details?: string; hint?: string; code?: string };
    const message = e instanceof Error
      ? e.message
      : err && typeof err === "object"
        ? [err.message, err.details, err.hint, err.code].filter(Boolean).join(" | ") ||
          JSON.stringify(e)
        : String(e);
    await supabase.from("sync_status").upsert({
      source: "meta",
      status: "error",
      last_run_at: new Date().toISOString(),
      message,
    });
    return json({ ok: false, error: message, ...debug }, 500);
  }
});
