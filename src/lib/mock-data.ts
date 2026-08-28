/**
 * Dados mock determinísticos (seed fixa) — evitam divergência entre SSR e cliente.
 * Serão substituídos pelas tabelas de cache do backend quando as integrações
 * (Google Sheets para leads/MQL, Meta Ads para investimento, GoHighLevel para
 * vendas) forem ligadas em Configurações.
 */

export type LeadGrade = "A" | "B" | "C" | "D";

export type Channel =
  | "Meta Ads"
  | "Google Ads"
  | "Instagram Orgânico"
  | "TikTok Ads"
  | "YouTube Ads";

export type Creative = {
  id: string;
  name: string;
  channel: Channel;
  /** Link para a demo do vídeo do criativo. */
  videoUrl: string;
};

export type Lead = {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  channel: Channel;
  creativeId: string;
  grade: LeadGrade;
  /** MQL = leads grade A ou B. */
  isMql: boolean;
  /** Marcado quando o lead virou venda no GoHighLevel. */
  sold: boolean;
};

export type SpendRow = {
  date: string; // YYYY-MM-DD
  creativeId: string;
  channel: Channel;
  amount: number;
};

export const CHANNELS: Channel[] = [
  "Meta Ads",
  "Google Ads",
  "Instagram Orgânico",
  "TikTok Ads",
  "YouTube Ads",
];

/** Mantido para a aba "Vendas (GHL)" em Configurações. */
export const PIPELINES = ["Comercial Inbound", "Comercial Outbound"];

const SAMPLE_VIDEO =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export const CREATIVES: Creative[] = [
  { id: "cr-01", name: "01 · Depoimento — Ana", channel: "Meta Ads", videoUrl: SAMPLE_VIDEO },
  { id: "cr-02", name: "02 · VSL Método KP", channel: "Meta Ads", videoUrl: SAMPLE_VIDEO },
  { id: "cr-03", name: "03 · Antes e Depois", channel: "Meta Ads", videoUrl: SAMPLE_VIDEO },
  { id: "cr-04", name: "04 · Reels Bastidores", channel: "Instagram Orgânico", videoUrl: SAMPLE_VIDEO },
  { id: "cr-05", name: "05 · Search — Palavra Marca", channel: "Google Ads", videoUrl: SAMPLE_VIDEO },
  { id: "cr-06", name: "06 · Search — Concorrente", channel: "Google Ads", videoUrl: SAMPLE_VIDEO },
  { id: "cr-07", name: "07 · TikTok — Trend de Áudio", channel: "TikTok Ads", videoUrl: SAMPLE_VIDEO },
  { id: "cr-08", name: "08 · TikTok — POV Cliente", channel: "TikTok Ads", videoUrl: SAMPLE_VIDEO },
  { id: "cr-09", name: "09 · YouTube — Case 90s", channel: "YouTube Ads", videoUrl: SAMPLE_VIDEO },
  { id: "cr-10", name: "10 · Carrossel Prova Social", channel: "Meta Ads", videoUrl: SAMPLE_VIDEO },
];

export const CREATIVE_BY_ID: Record<string, Creative> = Object.fromEntries(
  CREATIVES.map((c) => [c.id, c]),
);

/** Investimento diário médio por criativo (R$). 0 = canal orgânico, sem mídia. */
const CREATIVE_DAILY_SPEND: Record<string, number> = {
  "cr-01": 90,
  "cr-02": 130,
  "cr-03": 80,
  "cr-04": 0,
  "cr-05": 70,
  "cr-06": 50,
  "cr-07": 60,
  "cr-08": 70,
  "cr-09": 110,
  "cr-10": 85,
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

export const isoAgo = isoMinusDays;

const FIRST_NAMES = [
  "Ana", "Bruno", "Carla", "Diego", "Elaine", "Felipe", "Gabriela", "Hugo",
  "Isabela", "João", "Karina", "Lucas", "Marina", "Nícolas", "Olívia",
  "Paulo", "Renata", "Sérgio", "Tatiane", "Vitor",
];
const LAST_NAMES = [
  "Silva", "Souza", "Oliveira", "Costa", "Pereira", "Almeida", "Nunes",
  "Rocha", "Dias", "Barbosa", "Cardoso", "Teixeira",
];

function mockName(rnd: () => number) {
  return `${FIRST_NAMES[Math.floor(rnd() * FIRST_NAMES.length)]} ${
    LAST_NAMES[Math.floor(rnd() * LAST_NAMES.length)]
  }`;
}

function buildSpend(): SpendRow[] {
  const rnd = mulberry32(88011);
  const rows: SpendRow[] = [];
  for (let d = 89; d >= 0; d--) {
    const date = isoMinusDays(TODAY, d);
    for (const c of CREATIVES) {
      const base = CREATIVE_DAILY_SPEND[c.id] ?? 0;
      if (base === 0) continue; // canal orgânico não tem investimento
      if (rnd() < 0.22) continue; // nem todo criativo roda todo dia
      rows.push({
        date,
        creativeId: c.id,
        channel: c.channel,
        amount: Math.round(base * (0.6 + rnd() * 0.9)),
      });
    }
  }
  return rows;
}

function buildLeads(): Lead[] {
  const rnd = mulberry32(20260827);
  const leads: Lead[] = [];
  const total = 420;

  for (let i = 0; i < total; i++) {
    const daysAgo = Math.floor(rnd() * 90);
    const date = isoMinusDays(TODAY, daysAgo);
    const creative = CREATIVES[Math.floor(rnd() * CREATIVES.length)]!;

    const g = rnd();
    const grade: LeadGrade = g < 0.18 ? "A" : g < 0.42 ? "B" : g < 0.72 ? "C" : "D";
    const isMql = grade === "A" || grade === "B";
    const sold = isMql && daysAgo > 5 && rnd() < (grade === "A" ? 0.22 : 0.08);

    leads.push({
      id: `lead-${i + 1}`,
      date,
      name: mockName(rnd),
      channel: creative.channel,
      creativeId: creative.id,
      grade,
      isMql,
      sold,
    });
  }
  return leads.sort((a, b) => (a.date < b.date ? -1 : 1));
}

export const MOCK_LEADS: Lead[] = buildLeads();
export const MOCK_SPEND: SpendRow[] = buildSpend();

export type Metrics = {
  investment: number;
  leads: number;
  mqls: number;
  gradeA: number;
  gradeB: number;
  gradeC: number;
  gradeD: number;
  mqlRate: number; // %
  cpmql: number;
  cpl: number;
  sold: number;
};

export function computeMetrics(leads: Lead[], spend: SpendRow[]): Metrics {
  const investment = spend.reduce((s, r) => s + r.amount, 0);
  const total = leads.length;
  const gradeA = leads.filter((l) => l.grade === "A").length;
  const gradeB = leads.filter((l) => l.grade === "B").length;
  const gradeC = leads.filter((l) => l.grade === "C").length;
  const gradeD = leads.filter((l) => l.grade === "D").length;
  const mqls = gradeA + gradeB;

  return {
    investment,
    leads: total,
    mqls,
    gradeA,
    gradeB,
    gradeC,
    gradeD,
    mqlRate: total === 0 ? 0 : (mqls / total) * 100,
    cpmql: mqls === 0 ? 0 : investment / mqls,
    cpl: total === 0 ? 0 : investment / total,
    sold: leads.filter((l) => l.sold).length,
  };
}

export function filterLeads(opts: { from: string; to: string; channel: string }): Lead[] {
  return MOCK_LEADS.filter(
    (l) =>
      l.date >= opts.from &&
      l.date <= opts.to &&
      (opts.channel === "todos" || l.channel === opts.channel),
  );
}

export function filterSpend(opts: { from: string; to: string; channel: string }): SpendRow[] {
  return MOCK_SPEND.filter(
    (r) =>
      r.date >= opts.from &&
      r.date <= opts.to &&
      (opts.channel === "todos" || r.channel === opts.channel),
  );
}

export function shiftRange(from: string, to: string) {
  const span = daysBetween(from, to) + 1;
  return { from: isoMinusDays(from, span), to: isoMinusDays(to, span) };
}

export type TimePoint = { date: string; leads: number; mqls: number };

export function buildTimeSeries(
  leads: Lead[],
  from: string,
  to: string,
  gran: "dia" | "semana" | "mes",
): TimePoint[] {
  const buckets = new Map<string, TimePoint>();
  const span = daysBetween(from, to);

  for (let i = 0; i <= span; i++) {
    const d = isoMinusDays(to, span - i);
    const key = bucketKey(d, gran);
    if (!buckets.has(key)) buckets.set(key, { date: key, leads: 0, mqls: 0 });
  }
  for (const l of leads) {
    const b = buckets.get(bucketKey(l.date, gran));
    if (!b) continue;
    b.leads += 1;
    if (l.isMql) b.mqls += 1;
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

export type CreativeStats = {
  creative: Creative;
  leads: number;
  mqls: number;
  gradeA: number;
  gradeB: number;
  gradeC: number;
  gradeD: number;
  mqlRate: number; // %
  investment: number;
  cpmql: number;
  sold: boolean;
  leadList: Lead[];
};

export function creativeBreakdown(leads: Lead[], spend: SpendRow[]): CreativeStats[] {
  const spendByCreative = new Map<string, number>();
  for (const r of spend) {
    spendByCreative.set(r.creativeId, (spendByCreative.get(r.creativeId) ?? 0) + r.amount);
  }

  const leadsByCreative = new Map<string, Lead[]>();
  for (const l of leads) {
    const arr = leadsByCreative.get(l.creativeId) ?? [];
    arr.push(l);
    leadsByCreative.set(l.creativeId, arr);
  }

  const ids = new Set<string>([...leadsByCreative.keys(), ...spendByCreative.keys()]);

  return [...ids]
    .map((id) => {
      const creative = CREATIVE_BY_ID[id] ?? {
        id,
        name: id,
        channel: "Meta Ads" as Channel,
        videoUrl: SAMPLE_VIDEO,
      };
      const list = (leadsByCreative.get(id) ?? []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
      const gradeA = list.filter((l) => l.grade === "A").length;
      const gradeB = list.filter((l) => l.grade === "B").length;
      const gradeC = list.filter((l) => l.grade === "C").length;
      const gradeD = list.filter((l) => l.grade === "D").length;
      const mqls = gradeA + gradeB;
      const investment = spendByCreative.get(id) ?? 0;
      return {
        creative,
        leads: list.length,
        mqls,
        gradeA,
        gradeB,
        gradeC,
        gradeD,
        mqlRate: list.length === 0 ? 0 : (mqls / list.length) * 100,
        investment,
        cpmql: mqls === 0 ? 0 : investment / mqls,
        sold: list.some((l) => l.sold),
        leadList: list,
      };
    })
    .sort((a, b) => b.leads - a.leads);
}

export type ChannelStats = { channel: string; qty: number; cost: number };

export function channelBreakdown(leads: Lead[], spend: SpendRow[]): ChannelStats[] {
  const qty = new Map<string, number>();
  const cost = new Map<string, number>();
  for (const l of leads) qty.set(l.channel, (qty.get(l.channel) ?? 0) + 1);
  for (const r of spend) cost.set(r.channel, (cost.get(r.channel) ?? 0) + r.amount);

  const channels = new Set<string>([...qty.keys(), ...cost.keys()]);
  return [...channels]
    .map((channel) => {
      const n = qty.get(channel) ?? 0;
      const spent = cost.get(channel) ?? 0;
      return { channel, qty: n, cost: n > 0 ? spent / n : 0 };
    })
    .sort((a, b) => b.qty - a.qty);
}
