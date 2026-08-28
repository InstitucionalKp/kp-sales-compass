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
  monetaryValue?: number;
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
    const tokenRow = await supabase
      .from("secret_config")
      .select("value")
      .eq("key", "ghl_access_token")
      .maybeSingle();
    const token = tokenRow.data?.value || Deno.env.get("GHL_ACCESS_TOKEN");

    const locRow = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "ghl_location_id")
      .maybeSingle();
    const locVal = locRow.data?.value as string | { id?: string } | null | undefined;
    const locationId =
      (typeof locVal === "string" ? locVal : locVal?.id) ||
      Deno.env.get("GHL_LOCATION_ID");

    if (!token || !locationId) {
      throw new Error(
        "Token do GHL e/ou Location ID não configurados. Preencha na tela de Configurações → GoHighLevel.",
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

    // mapa chave-de-contato -> maior valor de venda encontrado
    const valueByEmail = new Map<string, number>();
    const valueByPhone = new Map<string, number>();
    for (const o of filtered) {
      const v = Number(o.monetaryValue ?? 0) || 0;
      const em = (o.contact?.email ?? "").toLowerCase();
      const ph = phoneKey(o.contact?.phone);
      if (em) valueByEmail.set(em, Math.max(valueByEmail.get(em) ?? 0, v));
      if (ph) valueByPhone.set(ph, Math.max(valueByPhone.get(ph) ?? 0, v));
    }

    const { data: leads, error: leadsErr } = await supabase
      .from("leads")
      .select("id, email, contato");
    if (leadsErr) throw leadsErr;

    // agrupa por valor pra fazer poucos UPDATEs
    const now = new Date().toISOString();
    const byValue = new Map<number, string[]>();
    for (const l of (leads ?? []) as { id: string; email: string | null; contato: string | null }[]) {
      const em = (l.email ?? "").toLowerCase();
      const ph = phoneKey(l.contato);
      const hasEmail = em && valueByEmail.has(em);
      const hasPhone = ph && valueByPhone.has(ph);
      if (!hasEmail && !hasPhone) continue;
      const value = Math.max(
        hasEmail ? (valueByEmail.get(em) ?? 0) : 0,
        hasPhone ? (valueByPhone.get(ph) ?? 0) : 0,
      );
      const arr = byValue.get(value) ?? [];
      arr.push(l.id);
      byValue.set(value, arr);
    }

    const matched = [...byValue.values()].flat();
    for (const [value, ids] of byValue) {
      for (let i = 0; i < ids.length; i += 500) {
        const { error } = await supabase
          .from("leads")
          .update({ sold: true, sold_at: now, sale_value: value })
          .in("id", ids.slice(i, i + 500));
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
    const err = e as { message?: string; details?: string; hint?: string; code?: string };
    const message = e instanceof Error
      ? e.message
      : err && typeof err === "object"
        ? [err.message, err.details, err.hint, err.code].filter(Boolean).join(" | ") ||
          JSON.stringify(e)
        : String(e);
    await supabase.from("sync_status").upsert({
      source: "ghl",
      status: "error",
      last_run_at: new Date().toISOString(),
      message,
    });
    return json({ ok: false, error: message }, 500);
  }
});
