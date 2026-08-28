import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Coins, Info, Target, TriangleAlert, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { GoalBar } from "@/components/dashboard/GoalBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RateCard } from "@/components/dashboard/RateCard";
import { GradeBreakdownCard } from "@/components/dashboard/GradeBreakdownCard";
import { CreativeSection } from "@/components/dashboard/CreativeSection";
import { OriginTable, type OriginRow } from "@/components/dashboard/OriginTable";
import { EvolutionChart } from "@/components/dashboard/EvolutionChart";
import type { Granularity } from "@/lib/dashboard-search";
import { brl, dateLabel, num, pct } from "@/lib/format";
import {
  GOALS,
  TODAY,
  buildTimeSeries,
  campaignsFrom,
  channelBreakdown,
  computeMetrics,
  creativeBreakdown,
  daysInSpan,
  filterLeads,
  filterSpend,
  isoAgo,
  shiftRange,
} from "@/lib/mock-data";
import { useDashboardLeads, useDashboardSpend } from "@/lib/dashboard-data";
import { runAllSync, runSync, type SyncSource } from "@/lib/sync";

type Search = {
  campanha: string;
  de: string;
  ate: string;
  preset: number | null;
  gran: Granularity;
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard de Marketing | KP Assessoria" },
      {
        name: "description",
        content:
          "Dashboard de marketing da KP Assessoria: meta de MQL, investimento em tráfego, CPL, CPMQL e desempenho por criativo.",
      },
      { property: "og:title", content: "Dashboard de Marketing | KP Assessoria" },
      {
        property: "og:description",
        content:
          "Meta de MQL, investimento, CPL, CPMQL e os criativos que trazem leads e MQL — direto da planilha e do Meta Ads.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    campanha: typeof s["campanha"] === "string" ? s["campanha"] : "todas",
    de: typeof s["de"] === "string" ? s["de"] : isoAgo(TODAY, 29),
    ate: typeof s["ate"] === "string" ? s["ate"] : TODAY,
    preset: s["preset"] === null || s["preset"] === undefined ? 30 : Number(s["preset"]) || null,
    gran: s["gran"] === "semana" || s["gran"] === "mes" ? s["gran"] : "dia",
  }),
  component: Dashboard,
});

function Dashboard() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState<string | null>(null);

  const setSearch = (patch: Partial<Search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  const leadsQuery = useDashboardLeads();
  const spendQuery = useDashboardSpend();

  const isMock = leadsQuery.data?.source === "mock";
  const noLeads = leadsQuery.data?.empty === true;
  const allLeads = useMemo(() => leadsQuery.data?.leads ?? [], [leadsQuery.data]);
  const allSpend = useMemo(() => {
    const s = spendQuery.data;
    if (!s) return [];
    // não misturar leads reais com investimento mock
    if (!isMock && s.source === "mock") return [];
    return s.spend;
  }, [spendQuery.data, isMock]);

  const opts = useMemo(
    () => ({ from: search.de, to: search.ate, campaign: search.campanha }),
    [search.de, search.ate, search.campanha],
  );
  const prevOpts = useMemo(() => {
    const r = shiftRange(search.de, search.ate);
    return { ...r, campaign: search.campanha };
  }, [search.de, search.ate, search.campanha]);

  const leads = useMemo(() => filterLeads(allLeads, opts), [allLeads, opts]);
  const spend = useMemo(() => filterSpend(allSpend, opts), [allSpend, opts]);
  const m = useMemo(() => computeMetrics(leads, spend), [leads, spend]);
  const p = useMemo(
    () => computeMetrics(filterLeads(allLeads, prevOpts), filterSpend(allSpend, prevOpts)),
    [allLeads, allSpend, prevOpts],
  );

  const series = useMemo(
    () => buildTimeSeries(leads, search.de, search.ate, search.gran),
    [leads, search.de, search.ate, search.gran],
  );
  const creatives = useMemo(() => creativeBreakdown(leads, spend), [leads, spend]);
  const channelRows: OriginRow[] = useMemo(
    () => channelBreakdown(leads, spend).map((c) => ({ label: c.channel, qty: c.qty, cost: c.cost })),
    [leads, spend],
  );
  const campaigns = useMemo(() => campaignsFrom(allLeads), [allLeads]);

  const spanDays = daysInSpan(search.de, search.ate);
  const periodLabel =
    search.preset !== null
      ? `${search.preset} dias`
      : `${dateLabel(search.de)} – ${dateLabel(search.ate)}`;
  const investPercent = (m.investment / GOALS.investimentoMensal) * 100;

  const SYNC_LABEL: Record<SyncSource | "all", string> = {
    all: "Sincronização",
    sheets: "Google Sheets",
    meta: "Meta Ads",
    ghl: "GoHighLevel",
  };

  const handleSync = async (source: "all" | "meta" | "ghl" | "sheets") => {
    setSyncing(source);
    try {
      const outcomes =
        source === "all" ? await runAllSync() : [await runSync(source as SyncSource)];
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      for (const o of outcomes) {
        if (o.ok) toast.success(`${SYNC_LABEL[o.source]}: ${o.message}`);
        else toast.error(`${SYNC_LABEL[o.source]} falhou`, { description: o.message });
      }
    } finally {
      setSyncing(null);
    }
  };

  const loading = leadsQuery.isLoading;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <FilterBar
        filters={{
          campaign: search.campanha,
          from: search.de,
          to: search.ate,
          preset: search.preset,
        }}
        campaigns={campaigns}
        syncing={syncing}
        onChange={(patch) =>
          setSearch({
            ...(patch.campaign !== undefined ? { campanha: patch.campaign } : {}),
            ...(patch.from !== undefined ? { de: patch.from } : {}),
            ...(patch.to !== undefined ? { ate: patch.to } : {}),
            ...(patch.preset !== undefined ? { preset: patch.preset } : {}),
          })
        }
        onPreset={(d) => setSearch({ preset: d, de: isoAgo(TODAY, d - 1), ate: TODAY })}
        onSync={handleSync}
      />

      <main className="mx-auto flex max-w-[1600px] flex-col gap-4 p-4">
        <h1 className="sr-only">Dashboard de marketing KP Assessoria</h1>

        {noLeads ? (
          <div className="panel flex items-center gap-2 border-primary/40 p-3 text-sm">
            <TriangleAlert className="size-4 shrink-0 text-primary" />
            Nenhum lead sincronizado ainda. Clique em <strong>Sincronizar</strong> para puxar da
            planilha.
          </div>
        ) : null}

        <GoalBar
          actual={m.mqls}
          monthlyGoal={GOALS.mqlMensal}
          spanDays={spanDays}
          periodLabel={periodLabel}
        />

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={Wallet}
            label="Meta de Investimento"
            value={m.investment > 0 ? brl(m.investment) : null}
            source="Meta Ads"
            loading={loading}
            goal={{ label: `meta ${brl(GOALS.investimentoMensal)}`, percent: investPercent }}
          />
          <KpiCard
            icon={Coins}
            label="CPL (custo por lead)"
            value={m.leads && m.investment ? brl(m.cpl) : null}
            source="Meta Ads + Planilha"
            loading={loading}
          />
          <KpiCard
            icon={Target}
            label="CPMQL (custo por MQL)"
            value={m.mqls && m.investment ? brl(m.cpmql) : null}
            hint={`alvo ${brl(GOALS.cpmqlAlvo)}`}
            source="Meta Ads + Planilha"
            loading={loading}
          />
          <KpiCard
            icon={Users}
            label="Nº de Leads"
            value={num(m.leads)}
            source="Planilha"
            loading={loading}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <GradeBreakdownCard a={m.gradeA} b={m.gradeB} c={m.gradeC} d={m.gradeD} />
          </div>
          <RateCard label="Taxa de MQL %" value={pct(m.mqlRate)} delta={m.mqlRate - p.mqlRate} />
        </section>

        <CreativeSection rows={creatives} />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <OriginTable title="Leads por Canal" rows={channelRows} costLabel="CPL" />
          <div className="xl:col-span-2">
            <EvolutionChart
              data={series}
              granularity={search.gran}
              onGranularityChange={(gran) => setSearch({ gran })}
            />
          </div>
        </section>

        <p className="flex items-center justify-center gap-2 pb-6 text-xs text-muted-foreground">
          <Info className="size-3.5" />
          {isMock
            ? "Dados de demonstração — rode as migrações do banco e sincronize a planilha para ver dados reais."
            : "Dados ao vivo. Investimento e vendas dependem de conectar Meta Ads e GoHighLevel em Configurações."}
        </p>
      </main>
    </div>
  );
}
