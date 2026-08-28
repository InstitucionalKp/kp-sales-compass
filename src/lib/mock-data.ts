/**
 * Dados mock determinísticos (seed fixa) — evitam divergência entre SSR e cliente.
 *
 * Modelo espelha a planilha do Google Sheets que vai integrar:
 *   NOME · CONTATO · EMAIL · NOME DA EMPRESA · CARGO · STATUS DE REUNIÃO ·
 *   MQL (SIM/NÃO) · QUALIFICAÇÃO (A/B/C/D) · ... · ORIGEM · CAMPANHA ·
 *   CRIATIVO · CONJUNTO · DATA · HORA
 *
 * Regras da conta:
 *   - MQL = leads com QUALIFICAÇÃO A ou B (a coluna MQL fica guardada em `mqlFlag`
 *     mas não entra no cálculo).
 *   - Investimento vem do Meta Ads; vendas vêm do GoHighLevel.
 */

export type LeadGrade = "A" | "B" | "C" | "D";

export type Channel =
  | "Meta Ads"
  | "Google Ads"
  | "Instagram Orgânico"
  | "TikTok Ads";

export type CreativeMeta = {
  name: string;
  campaign: string;
  adset: string;
  channel: Channel;
  /** Link para a demo do vídeo. Vazio = criativo sem vídeo (ex. link na bio). */
  videoUrl: string;
};

export type Lead = {
  id: string;
  datetime: string; // ISO local "YYYY-MM-DDTHH:mm"
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  name: string;
  company: string;
  origin: string;
  campaign: string;
  adset: string;
  creative: string;
  channel: Channel;
  grade: LeadGrade;
  /** MQL = grade A ou B. */
  isMql: boolean;
  /** Valor bruto da coluna MQL da planilha (SIM/NÃO). Guardado, fora do cálculo. */
  mqlFlag: boolean;
  meetingStatus: string;
  /** Marcado quando o lead virou venda no GoHighLevel. */
  sold: boolean;
};

export type SpendRow = {
  date: string;
  creative: string;
  campaign: string;
  channel: Channel;
  amount: number;
};

export const GOALS = {
  mqlMensal: 70,
  investimentoMensal: 20000,
  cpmqlAlvo: 300,
};

export const CHANNELS: Channel[] = [
  "Meta Ads",
  "Google Ads",
  "Instagram Orgânico",
  "TikTok Ads",
];

/** Mantido para a aba "Vendas (GHL)" em Configurações. */
export const PIPELINES = ["Comercial Inbound", "Comercial Outbound"];

const SAMPLE_VIDEO =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export const CREATIVES: CreativeMeta[] = [
  {
    name: "BIDCAP · AD · Nadiele",
    campaign: "KP · BIDCAP · 1x1x1 · Nadiele",
    adset: "BIDCAP · CJ · Nadiele",
    channel: "Meta Ads",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    name: "BIDCAP · AD · Depoimento",
    campaign: "KP · BIDCAP · 1x1x1 · Nadiele",
    adset: "BIDCAP · CJ · Nadiele",
    channel: "Meta Ads",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    name: "FORMSN · Nadiele",
    campaign: "Nosso Público · Forms Nativo",
    adset: "Instagram Feed",
    channel: "Meta Ads",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    name: "FORMSN · Prova Social",
    campaign: "Nosso Público · Forms Nativo",
    adset: "Instagram Feed",
    channel: "Meta Ads",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    name: "ADV+ · Antes e Depois",
    campaign: "KP · Advantage+ · Abril",
    adset: "Advantage+ Compras",
    channel: "Meta Ads",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    name: "ADV+ · VSL 90s",
    campaign: "KP · Advantage+ · Abril",
    adset: "Advantage+ Compras",
    channel: "Meta Ads",
    videoUrl: SAMPLE_VIDEO,
  },
  {
    name: "Search · Marca",
    campaign: "Google · Search Marca",
    adset: "Palavra-chave Marca",
    channel: "Google Ads",
    videoUrl: "",
  },
  {
    name: "link_in_bio",
    campaign: "Instagram Orgânico",
    adset: "Bio",
    channel: "Instagram Orgânico",
    videoUrl: "",
  },
];

export const CREATIVE_BY_NAME: Record<string, CreativeMeta> = Object.fromEntries(
  CREATIVES.map((c) => [c.name, c]),
);

export const CAMPAIGNS: string[] = [...new Set(CREATIVES.map((c) => c.campaign))];

/** Investimento diário médio por criativo (R$). 0 = sem mídia (orgânico). */
const CREATIVE_DAILY_SPEND: Record<string, number> = {
  "BIDCAP · AD · Nadiele": 120,
  "BIDCAP · AD · Depoimento": 90,
  "FORMSN · Nadiele": 70,
  "FORMSN · Prova Social": 60,
  "ADV+ · Antes e Depois": 140,
  "ADV+ · VSL 90s": 110,
  "Search · Marca": 80,
  link_in_bio: 0,
};

/** Peso relativo de volume de leads por criativo. */
const CREATIVE_LEAD_WEIGHT: Record<string, number> = {
  "BIDCAP · AD · Nadiele": 5,
  "BIDCAP · AD · Depoimento": 3,
  "FORMSN · Nadiele": 4,
  "FORMSN · Prova Social": 2,
  "ADV+ · Antes e Depois": 3,
  "ADV+ · VSL 90s": 2,
  "Search · Marca": 2,
  link_in_bio: 1,
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

export function daysInSpan(from: string, to: string) {
  return Math.max(1, daysBetween(from, to) + 1);
}

const FIRST_NAMES = [
  "Ana", "Bruno", "Carla", "Diego", "Elaine", "Felipe", "Gabriela", "Hugo",
  "Isabela", "João", "Karina", "Lucas", "Marina", "Nícolas", "Olívia",
  "Paulo", "Renata", "Sérgio", "Tatiane", "Vitor",
];
const LAST_NAMES = [
  "Silva", "Souza", "Oliveira", "Costa", "Pereira", "Almeida", "Nunes",
  "Rocha", "Dias", "Barbosa", "Cardoso", "Teixeira",
];
const COMPANY_SUFFIX = ["Motos", "Veículos", "Auto Center", "Moto Peças", "Multimarcas", "Automóveis"];

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)]!;
}

/** Lista de criativos ponderada por volume, para o sorteio dos leads. */
const WEIGHTED_CREATIVES: CreativeMeta[] = CREATIVES.flatMap((c) =>
  Array.from({ length: CREATIVE_LEAD_WEIGHT[c.name] ?? 1 }, () => c),
);

function buildSpend(): SpendRow[] {
  const rnd = mulberry32(88011);
  const rows: SpendRow[] = [];
  for (let d = 89; d >= 0; d--) {
    const date = isoMinusDays(TODAY, d);
    for (const c of CREATIVES) {
      const base = CREATIVE_DAILY_SPEND[c.name] ?? 0;
      if (base === 0) continue;
      if (rnd() < 0.18) continue;
      rows.push({
        date,
        creative: c.name,
        campaign: c.campaign,
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
  const total = 460;

  for (let i = 0; i < total; i++) {
    const daysAgo = Math.floor(rnd() * 90);
    const date = isoMinusDays(TODAY, daysAgo);
    const hh = String(8 + Math.floor(rnd() * 14)).padStart(2, "0");
    const mm = String(Math.floor(rnd() * 60)).padStart(2, "0");
    const time = `${hh}:${mm}`;

    const creative = pick(WEIGHTED_CREATIVES, rnd);

    const g = rnd();
    const grade: LeadGrade = g < 0.16 ? "A" : g < 0.4 ? "B" : g < 0.72 ? "C" : "D";
    const isMql = grade === "A" || grade === "B";
    // a coluna MQL da planilha é preenchida à mão — quase sempre bate com A/B,
    // mas às vezes o time marca SIM num C.
    const mqlFlag = isMql ? rnd() > 0.05 : rnd() < 0.06;
    const sold = isMql && daysAgo > 5 && rnd() < (grade === "A" ? 0.2 : 0.07);
    const meetingStatus = isMql
      ? pick(["", "Agendado", "Realizado", "noshow", ""], rnd)
      : "";

    leads.push({
      id: `lead-${i + 1}`,
      datetime: `${date}T${time}`,
      date,
      time,
      name: `${pick(FIRST_NAMES, rnd)} ${pick(LAST_NAMES, rnd)}`,
      company: `${pick(LAST_NAMES, rnd)} ${pick(COMPANY_SUFFIX, rnd)}`,
      origin: creative.channel === "Meta Ads" ? "facebookads" : creative.channel.toLowerCase(),
      campaign: creative.campaign,
      adset: creative.adset,
      creative: creative.name,
      channel: creative.channel,
      grade,
      isMql,
      mqlFlag,
      meetingStatus,
      sold,
    });
  }
  return leads.sort((a, b) => (a.datetime < b.datetime ? -1 : 1));
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

export type FilterOpts = { from: string; to: string; campaign: string };

export function filterLeads(rows: Lead[], opts: FilterOpts): Lead[] {
  return rows.filter(
    (l) =>
      l.date >= opts.from &&
      l.date <= opts.to &&
      (opts.campaign === "todas" || l.campaign === opts.campaign),
  );
}

export function filterSpend(rows: SpendRow[], opts: FilterOpts): SpendRow[] {
  return rows.filter(
    (r) =>
      r.date >= opts.from &&
      r.date <= opts.to &&
      (opts.campaign === "todas" || r.campaign === opts.campaign),
  );
}

/** Lista de campanhas presentes nos dados (para o filtro). */
export function campaignsFrom(rows: Lead[]): string[] {
  return [...new Set(rows.map((l) => l.campaign).filter((c) => c && c !== "—"))].sort();
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
  name: string;
  campaign: string;
  adset: string;
  channel: string;
  videoUrl: string;
  leads: number;
  mqls: number;
  gradeA: number;
  gradeB: number;
  gradeC: number;
  gradeD: number;
  mqlRate: number; // %
  investment: number;
  cpl: number;
  cpmql: number;
  sold: boolean;
  leadList: Lead[];
};

export function creativeBreakdown(leads: Lead[], spend: SpendRow[]): CreativeStats[] {
  const spendByCreative = new Map<string, number>();
  for (const r of spend) {
    spendByCreative.set(r.creative, (spendByCreative.get(r.creative) ?? 0) + r.amount);
  }

  const leadsByCreative = new Map<string, Lead[]>();
  for (const l of leads) {
    const arr = leadsByCreative.get(l.creative) ?? [];
    arr.push(l);
    leadsByCreative.set(l.creative, arr);
  }

  const names = new Set<string>([...leadsByCreative.keys(), ...spendByCreative.keys()]);

  return [...names]
    .map((name) => {
      const meta = CREATIVE_BY_NAME[name];
      const list = (leadsByCreative.get(name) ?? [])
        .slice()
        .sort((a, b) => (a.datetime < b.datetime ? 1 : -1));
      const gradeA = list.filter((l) => l.grade === "A").length;
      const gradeB = list.filter((l) => l.grade === "B").length;
      const gradeC = list.filter((l) => l.grade === "C").length;
      const gradeD = list.filter((l) => l.grade === "D").length;
      const mqls = gradeA + gradeB;
      const investment = spendByCreative.get(name) ?? 0;
      return {
        name,
        campaign: meta?.campaign ?? "—",
        adset: meta?.adset ?? "—",
        channel: meta?.channel ?? "Meta Ads",
        videoUrl: meta?.videoUrl ?? "",
        leads: list.length,
        mqls,
        gradeA,
        gradeB,
        gradeC,
        gradeD,
        mqlRate: list.length === 0 ? 0 : (mqls / list.length) * 100,
        investment,
        cpl: list.length === 0 ? 0 : investment / list.length,
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
