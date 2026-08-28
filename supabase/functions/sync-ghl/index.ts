// sync-ghl — marca em public.leads quais leads viraram venda no GoHighLevel.
// Secrets necessários (cadastrar no Lovable Cloud):
//   GHL_ACCESS_TOKEN   — Private Integration Token
//   GHL_LOCATION_ID    — Location ID
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { corsHeaders, json } from "../_shared/cors.ts";

const BASE = "https://services.leadconnectorhq.com";

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");
const phoneKey = (s: string | null | undefined) => {
  const d = digits(s);
  return d.length >= 8 ? d.slice(-8) : "";
};

type Opp = {
  id: string;
  status: string;
  pipelineStageId?: string;
  contact?: { email?: string; phone?: string };
  createdAt?: string;
  lastStatusChangeAt?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  await supabase.from("sync_status").upsert({
    source: "ghl",
    status: "running",
    last_run_at: new Date().toISOString(),
    message: null,
  });

  try {
    const token = Deno.env.get("GHL_ACCESS_TOKEN");
    const locationId = Deno.env.get("GHL_LOCATION_ID");
    if (!token || !locationId) {
      throw new Error(
        "GHL_ACCESS_TOKEN e/ou GHL_LOCATION_ID não configurados. Cadastre como secrets no Lovable Cloud.",
      );
    }

    // quais stages contam como venda (opcional — se não configurado, usa status=won)
    const cfg = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "ghl_sale_stages")
      .maybeSingle();
    const saleStages = new Set<string>(
      Object.entries((cfg.data?.value as { stages?: Record<string, string> })?.stages ?? {})
        .filter(([, v]) => v === "Conta como venda")
        .map(([k]) => k),
    );

    const headers = { Authorization: `Bearer ${token}`, Version: "2021-07-28" };
    const won: Opp[] = [];
    let page = 1;
    let guard = 0;
    while (guard++ < 50) {
      const url =
        `${BASE}/opportunities/search?location_id=${locationId}&status=won&limit=100&page=${page}`;
      const res = await fetch(url, { headers });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message ?? `GHL API HTTP ${res.status}`);
      const batch = (body.opportunities ?? []) as Opp[];
      won.push(...batch);
      const total = body.meta?.total ?? body.total ?? won.length;
      if (batch.length === 0 || won.length >= total) break;
      page++;
    }

    const filtered = saleStages.size
      ? won.filter((o) => o.status === "won" || (o.pipelineStageId && saleStages.has(o.pipelineStageId)))
      : won;

    const emailSet = new Set(filtered.map((o) => (o.contact?.email ?? "").toLowerCase()).filter(Boolean));
    const phoneSet = new Set(filtered.map((o) => phoneKey(o.contact?.phone)).filter(Boolean));

    const { data: leads, error: leadsErr } = await supabase
      .from("leads")
      .select("id, email, contato");
    if (leadsErr) throw leadsErr;

    const matched = (leads ?? [])
      .filter(
        (l: { email: string | null; contato: string | null }) =>
          (l.email && emailSet.has(l.email.toLowerCase())) ||
          (phoneKey(l.contato) && phoneSet.has(phoneKey(l.contato))),
      )
      .map((l: { id: string }) => l.id);

    if (matched.length) {
      for (let i = 0; i < matched.length; i += 500) {
        const { error } = await supabase
          .from("leads")
          .update({ sold: true, sold_at: new Date().toISOString() })
          .in("id", matched.slice(i, i + 500));
        if (error) throw error;
      }
    }

    await supabase.from("sync_status").upsert({
      source: "ghl",
      status: "ok",
      last_run_at: new Date().toISOString(),
      rows: matched.length,
      message: `${filtered.length} vendas no GHL, ${matched.length} leads casados`,
    });
    return json({ ok: true, won: filtered.length, matched: matched.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase.from("sync_status").upsert({
      source: "ghl",
      status: "error",
      last_run_at: new Date().toISOString(),
      message,
    });
    return json({ ok: false, error: message }, 500);
  }
});
