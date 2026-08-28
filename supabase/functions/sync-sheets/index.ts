// sync-sheets — lê a planilha pública do Google Sheets (export CSV, sem credencial)
// e grava os leads na tabela public.leads.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { corsHeaders, json } from "../_shared/cors.ts";

/** Parser CSV RFC-4180 (o export do Google Sheets é bem-formado). */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // ignora
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const DEFAULT_SHEET_ID = "1esmBP_vybIjhh2aw7miaS-oZMp9pDeroAUhYFaiTs9c";
const DEFAULT_GID = "220089555";

// nome interno -> cabeçalho da planilha (fallback; sobrescrito por app_config.sheet_column_map)
const DEFAULT_COL_MAP: Record<string, string> = {
  nome: "NOME",
  contato: "CONTATO",
  email: "EMAIL",
  empresa: "NOME DA EMPRESA",
  cargo: "CARGO",
  status_reuniao: "STATUS DE REUNIÃO",
  mql_flag: "MQL",
  qualificacao: "QUALIFICAÇÃO",
  origem: "ORIGEM",
  campanha: "CAMPANHA",
  criativo: "CRIATIVO",
  conjunto: "CONJUNTO",
  vende: "O QUE ELE VENDE",
  data: "DATA",
  hora: "HORA",
};

// A página de Configurações salva o mapa como { "Nome do Lead": "NOME", ... }.
// Traduz os rótulos da UI para as chaves internas.
const UI_LABEL_TO_KEY: Record<string, string> = {
  "Nome do Lead": "nome",
  Empresa: "empresa",
  Origem: "origem",
  Campanha: "campanha",
  Conjunto: "conjunto",
  Criativo: "criativo",
  "Qualificação (A/B/C/D)": "qualificacao",
  "MQL (SIM/NÃO)": "mql_flag",
  "Status de Reunião": "status_reuniao",
  Data: "data",
  Hora: "hora",
};

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normDate(raw: string): string | null {
  const s = (raw ?? "").trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

function normTime(raw: string): string {
  const m = (raw ?? "").trim().match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "00:00";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const started = new Date().toISOString();
  await supabase.from("sync_status").upsert({
    source: "sheets",
    status: "running",
    last_run_at: started,
    message: null,
  });

  try {
    const cfgRes = await supabase.from("app_config").select("value").eq("key", "sheet_source").maybeSingle();
    const src = (cfgRes.data?.value ?? {}) as { spreadsheetId?: string; gid?: string };
    const sheetId = src.spreadsheetId || DEFAULT_SHEET_ID;
    const gid = src.gid || DEFAULT_GID;

    const mapRes = await supabase.from("app_config").select("value").eq("key", "sheet_column_map").maybeSingle();
    const uiMap = (mapRes.data?.value ?? {}) as Record<string, string>;
    const colMap = { ...DEFAULT_COL_MAP };
    for (const [label, header] of Object.entries(uiMap)) {
      const key = UI_LABEL_TO_KEY[label];
      if (key && header && header !== "—") colMap[key] = header;
    }

    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const res = await fetch(url, { redirect: "follow" });
    const text = await res.text();
    if (!res.ok || text.trimStart().startsWith("<!DOCTYPE") || text.includes("<html")) {
      throw new Error(
        `Não consegui ler a planilha (HTTP ${res.status}). Confirme que está compartilhada como "qualquer pessoa com o link pode ver".`,
      );
    }

    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error("Planilha sem linhas de dados.");

    const header = (rows[0] ?? []).map((h) => h.trim());
    const idx = (internalKey: string) => {
      const wanted = (colMap[internalKey] ?? "").trim().toLowerCase();
      return header.findIndex((h) => h.toLowerCase() === wanted);
    };
    const col = {
      nome: idx("nome"), contato: idx("contato"), email: idx("email"), empresa: idx("empresa"),
      cargo: idx("cargo"), status_reuniao: idx("status_reuniao"), mql_flag: idx("mql_flag"),
      qualificacao: idx("qualificacao"), origem: idx("origem"), campanha: idx("campanha"),
      criativo: idx("criativo"), conjunto: idx("conjunto"), vende: idx("vende"),
      data: idx("data"), hora: idx("hora"),
    };

    const get = (r: string[], i: number) => (i >= 0 && i < r.length ? (r[i] ?? "").trim() : "");

    const records: Record<string, unknown>[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.every((c) => !c || !c.trim())) continue;

      const dateStr = normDate(get(r, col.data));
      const timeStr = normTime(get(r, col.hora));
      const q = get(r, col.qualificacao).toUpperCase().replace(/[^ABCD]/g, "").slice(0, 1) || null;
      const isMql = q === "A" || q === "B";
      const mqlFlag = /^s(im)?$/i.test(get(r, col.mql_flag).trim());
      const contato = get(r, col.contato);
      const email = get(r, col.email).toLowerCase();
      const criativo = get(r, col.criativo);

      const id = await sha256(
        [contato, email, dateStr ?? "", timeStr, criativo, get(r, col.nome)].join("|"),
      );

      records.push({
        id,
        nome: get(r, col.nome) || null,
        contato: contato || null,
        email: email || null,
        empresa: get(r, col.empresa) || null,
        cargo: get(r, col.cargo) || null,
        status_reuniao: get(r, col.status_reuniao) || null,
        mql_flag: mqlFlag,
        qualificacao: q,
        is_mql: isMql,
        origem: get(r, col.origem) || null,
        campanha: get(r, col.campanha) || null,
        criativo: criativo || null,
        conjunto: get(r, col.conjunto) || null,
        vende: get(r, col.vende) || null,
        lead_date: dateStr,
        lead_time: timeStr,
        lead_at: dateStr ? `${dateStr}T${timeStr}:00-03:00` : null,
        raw: Object.fromEntries(header.map((h, j) => [h, r[j] ?? ""])),
        synced_at: new Date().toISOString(),
      });
    }

    // dedupe por id (linhas idênticas na planilha)
    const byId = new Map(records.map((rec) => [rec.id as string, rec]));
    const unique = [...byId.values()];

    for (let i = 0; i < unique.length; i += 500) {
      const batch = unique.slice(i, i + 500);
      const { error } = await supabase.from("leads").upsert(batch, { onConflict: "id" });
      if (error) throw error;
    }

    await supabase.from("sync_status").upsert({
      source: "sheets",
      status: "ok",
      last_run_at: new Date().toISOString(),
      rows: unique.length,
      message: null,
    });

    return json({ ok: true, rows: unique.length, sheetId, gid });
  } catch (e) {
    const err = e as { message?: string; details?: string; hint?: string; code?: string };
    const message = e instanceof Error
      ? e.message
      : err && typeof err === "object"
        ? [err.message, err.details, err.hint, err.code].filter(Boolean).join(" | ") ||
          JSON.stringify(e)
        : String(e);
    await supabase.from("sync_status").upsert({
      source: "sheets",
      status: "error",
      last_run_at: new Date().toISOString(),
      message,
    });
    return json({ ok: false, error: message }, 500);
  }
});
