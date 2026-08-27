/**
 * Dados mock determinísticos (seed fixa) — evitam divergência entre SSR e cliente.
 * Serão substituídos pelas tabelas de cache do backend quando as integrações forem ligadas.
 */

export type FunnelStage =
  | "lead"
  | "mql"
  | "reuniao_agendada"
  | "reuniao_realizada"
  | "proposta"
  | "venda";

export type Lead = {
  id: string;
  date: string; // YYYY-MM-DD
  seller: string;
  origin: string;
  pipeline: string;
  isMql: boolean;
  scheduled: boolean;
  held: boolean;
  proposal: boolean;
  won: boolean;
  value: number;
  wonDate: string | null;
  source: "GHL" | "Planilha";
};

export const SELLERS = [
  "Ana Beatriz",
  "Carlos Mendes",
  "Fernanda Lima",
  "Rafael Souza",
  "Juliana Prado",
];

export const PIPELINES = ["Comercial Inbound", "Comercial Outbound"];

export const ORIGINS = [
  "Meta Ads",
  "Google Ads",
  "Indicação",
  "Instagram Orgânico",
  "Prospecção Ativa",
  "Site / Formulário",
  "Evento",
];

/** Investimento mock por origem no período de 60 dias (Meta Ads / mídia paga). */
export const ORIGIN_SPEND: Record<string, number> = {
  "Meta Ads": 38500,
  "Google Ads": 21400,
  Indicação: 0,
  "Instagram Orgânico": 0,
  "Prospecção Ativa": 6200,
  "Site / Formulário": 0,
  Evento: 9800,
};

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const TODAY = "2026-08-27";

function isoMinusDays(base: string, days: number) {
  const d = new Date(`${base}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export const daysBetween = (a: string, b: string) =>
  Math.round(
    (new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000,
  );

function buildLeads(): Lead[] {
  const rnd = mulberry32(20260827);
  const leads: Lead[] = [];
  const total = 168;

  for (let i = 0; i < total; i++) {
    const daysAgo = Math.floor(rnd() * 90);
    const date = isoMinusDays(TODAY, daysAgo);
    const seller = SELLERS[Math.floor(rnd() * SELLERS.length)]!;
    const origin = ORIGINS[Math.floor(rnd() * ORIGINS.length)]!;
    const pipeline = rnd() > 0.35 ? PIPELINES[0]! : PIPELINES[1]!;

    const isMql = rnd() < 0.62;
    const scheduled = isMql && rnd() < 0.58;
    const held = scheduled && rnd() < 0.74;
    const proposal = held && rnd() < 0.66;
    // vendas só entre leads com maturidade suficiente
    const won = proposal && daysAgo > 4 && rnd() < 0.42;

    const cycle = 6 + Math.floor(rnd() * 22);
    const wonDate = won ? isoMinusDays(TODAY, Math.max(0, daysAgo - cycle)) : null;
    const value = won ? 3500 + Math.round(rnd() * 22) * 500 : 0;

    leads.push({
      id: `lead-${i + 1}`,
      date,
      seller,
      origin,
      pipeline,
      isMql,
      scheduled,
      held,
      proposal,
      won,
      value,
      wonDate,
      source: rnd() < 0.82 ? "GHL" : "Planilha",
    });
  }
  return leads.sort((a, b) => (a.date < b.date ? -1 : 1));
}

export const MOCK_LEADS: Lead[] = buildLeads();

export type Metrics = {
  leads: number;
  mqls: number;
  scheduled: number;
  held: number;
  noShowRate: number;
  proposals: number;
  won: number;
  revenue: number;
  ticket: number;
  cycleDays: number;
};

export function computeMetrics(rows: Lead[]): Metrics {
  const leads = rows.length;
  const mqls = rows.filter((r) => r.isMql).length;
  const scheduled = rows.filter((r) => r.scheduled).length;
  const held = rows.filter((r) => r.held).length;
  const proposals = rows.filter((r) => r.proposal).length;
  const wonRows = rows.filter((r) => r.won);
  const revenue = wonRows.reduce((s, r) => s + r.value, 0);
  const cycles = wonRows
    .filter((r) => r.wonDate)
    .map((r) => Math.max(1, daysBetween(r.date, r.wonDate!)));

  return {
    leads,
    mqls,
    scheduled,
    held,
    noShowRate: scheduled === 0 ? 0 : ((scheduled - held) / scheduled) * 100,
    proposals,
    won: wonRows.length,
    revenue,
    ticket: wonRows.length === 0 ? 0 : revenue / wonRows.length,
    cycleDays: cycles.length === 0 ? 0 : cycles.reduce((s, c) => s + c, 0) / cycles.length,
  };
}

export function filterLeads(opts: {
  from: string;
  to: string;
  seller: string;
  pipeline: string;
}): Lead[] {
  return MOCK_LEADS.filter(
    (l) =>
      l.date >= opts.from &&
      l.date <= opts.to &&
      (opts.seller === "todos" || l.seller === opts.seller) &&
      (opts.pipeline === "todos" || l.pipeline === opts.pipeline),
  );
}

export function shiftRange(from: string, to: string) {
  const span = daysBetween(from, to) + 1;
  return { from: isoMinusDays(from, span), to: isoMinusDays(to, span) };
}

export const isoAgo = isoMinusDays;

export function buildTimeSeries(rows: Lead[], from: string, to: string, gran: "dia" | "semana" | "mes") {
  const buckets = new Map<string, { date: string; leads: number; revenue: number }>();
  const span = daysBetween(from, to);

  for (let i = 0; i <= span; i++) {
    const d = isoMinusDays(to, span - i);
    const key = bucketKey(d, gran);
    if (!buckets.has(key)) buckets.set(key, { date: key, leads: 0, revenue: 0 });
  }
  for (const r of rows) {
    const b = buckets.get(bucketKey(r.date, gran));
    if (b) b.leads += 1;
    if (r.won && r.wonDate) {
      const wb = buckets.get(bucketKey(r.wonDate, gran));
      if (wb) wb.revenue += r.value;
    }
  }
  return [...buckets.values()];
}

function bucketKey(iso: string, gran: "dia" | "semana" | "mes") {
  if (gran === "dia") return iso;
  const d = new Date(`${iso}T12:00:00Z`);
  if (gran === "mes") return `${iso.slice(0, 7)}-01`;
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((dow + 6) % 7));
  return d.toISOString().slice(0, 10);
}
