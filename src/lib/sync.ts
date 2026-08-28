import { supabase } from "@/integrations/supabase/client";

export type SyncSource = "sheets" | "meta" | "ghl";

const FN: Record<SyncSource, string> = {
  sheets: "sync-sheets",
  meta: "sync-meta",
  ghl: "sync-ghl",
};

export type SyncOutcome = { source: SyncSource; ok: boolean; message: string };

export async function runSync(source: SyncSource): Promise<SyncOutcome> {
  try {
    const { data, error } = await supabase.functions.invoke(FN[source], { body: {} });

    if (error) {
      let message = error.message || "Falha ao chamar a função";
      const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
      if (ctx?.json) {
        try {
          const body = (await ctx.json()) as { error?: string };
          if (body?.error) message = body.error;
        } catch {
          /* corpo não-JSON */
        }
      }
      return { source, ok: false, message };
    }

    const res = (data ?? {}) as { ok?: boolean; error?: string; rows?: number; matched?: number };
    if (res.ok === false) return { source, ok: false, message: res.error || "Erro no sync" };

    const n = res.rows ?? res.matched ?? 0;
    return { source, ok: true, message: `${n} registro(s)` };
  } catch (e) {
    return { source, ok: false, message: e instanceof Error ? e.message : "Erro desconhecido" };
  }
}

export async function runAllSync(): Promise<SyncOutcome[]> {
  const order: SyncSource[] = ["sheets", "meta", "ghl"];
  const out: SyncOutcome[] = [];
  for (const s of order) out.push(await runSync(s));
  return out;
}
