// sync-meta — puxa investimento diário por criativo do Meta Ads.
// Secrets necessários (cadastrar no Lovable Cloud):
//   META_ACCESS_TOKEN      — token de longa duração
//   META_AD_ACCOUNT_IDS    — "act_123,act_456" (ou só os números, separados por vírgula)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { corsHeaders, json } from "../_shared/cors.ts";

const API = "https://graph.facebook.com/v21.0";

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

    const leadTypes = new Set([
      "lead",
      "onsite_conversion.lead_grouped",
      "offsite_conversion.fb_pixel_lead",
    ]);

    const records: Record<string, unknown>[] = [];

    for (const account of accounts) {
      let next: string | null =
        `${API}/${account}/insights?level=ad&time_increment=1&date_preset=last_90d` +
        `&fields=campaign_name,adset_name,ad_name,spend,impressions,clicks,actions&limit=500` +
        `&access_token=${encodeURIComponent(token)}`;

      let guard = 0;
      while (next && guard++ < 50) {
        const res = await fetch(next);
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body?.error?.message ?? `Meta API HTTP ${res.status}`);
        }
        for (const row of (body.data ?? []) as Insight[]) {
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
        next = body.paging?.next ?? null;
      }
    }

    for (let i = 0; i < records.length; i += 500) {
      const { error } = await supabase
        .from("meta_insights")
        .upsert(records.slice(i, i + 500), { onConflict: "id" });
      if (error) throw error;
    }

    await supabase.from("sync_status").upsert({
      source: "meta",
      status: "ok",
      last_run_at: new Date().toISOString(),
      rows: records.length,
      message: null,
    });
    return json({ ok: true, rows: records.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase.from("sync_status").upsert({
      source: "meta",
      status: "error",
      last_run_at: new Date().toISOString(),
      message,
    });
    return json({ ok: false, error: message }, 500);
  }
});
