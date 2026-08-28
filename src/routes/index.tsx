import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Coins, Info, Target, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { GoalBar } from "@/components/dashboard/GoalBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RateCard } from "@/components/dashboard/RateCard";
import { GradeBreakdownCard } from "@/components/dashboard/GradeBreakdownCard";
import { CreativeContribTable } from "@/components/dashboard/CreativeContribTable";
import { OriginTable, type OriginRow } from "@/components/dashboard/OriginTable";
import { EvolutionChart } from "@/components/dashboard/EvolutionChart";
import type { Granularity } from "@/lib/dashboard-search";
import { brl, dateLabel, num, pct } from "@/lib/format";
import {
  CAMPAIGNS,
  GOALS,
  TODAY,
  buildTimeSeries,
  channelBreakdown,
  computeMetrics,
  creativeBreakdown,
  daysInSpan,
  filterLeads,
  filterSpend,
  isoAgo,
  shiftRange,
} from "@/lib/mock-data";

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
  const [syncing, setSyncing] = useState<string | null>(null);

  const setSearch = (patch: Partial<Search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  const leads = useMemo(
    () => filterLeads({ from: search.de, to: search.ate, campaign: search.campanha }),
    [search.de, search.ate, search.campanha],
  );
  const spend = useMemo(
    () => filterSpend({ from: search.de, to: search.ate, campaign: search.campanha }),
    [search.de, search.ate, search.campanha],
  );

  const prev = useMemo(() => {
    const r = shiftRange(search.de, search.ate);
    return {
      leads: filterLeads({ ...r, campaign: search.campanha }),
      spend: filterSpend({ ...r, campaign: search.campanha }),
    };
  }, [search.de, search.ate, search.campanha]);

  const m = useMemo(() => computeMetrics(leads, spend), [leads, spend]);
  const p = useMemo(() => computeMetrics(prev.leads, prev.spend), [prev]);

  const series = useMemo(
    () => buildTimeSeries(leads, search.de, search.ate, search.gran),
    [leads, search.de, search.ate, search.gran],
  );

  const creatives = useMemo(() => creativeBreakdown(leads, spend), [leads, spend]);

  const channelRows: OriginRow[] = useMemo(
    () => channelBreakdown(leads, spend).map((c) => ({ label: c.channel, qty: c.qty, cost: c.cost })),
    [leads, spend],
  );

  const spanDays = daysInSpan(search.de, search.ate);
  const periodLabel =
    search.preset !== null
      ? `${search.preset} dias`
      : `${dateLabel(search.de)} – ${dateLabel(search.ate)}`;

  const investPercent = (m.investment / GOALS.investimentoMensal) * 100;

  const handleSync = (source: "all" | "meta" | "ghl" | "sheets") => {
    setSyncing(source);
    const labels = {
      all: "todas as fontes",
      meta: "Meta Ads",
      ghl: "GoHighLevel",
      sheets: "Google Sheets",
    };
    setTimeout(() => {
      setSyncing(null);
      toast.error(`Sync de ${labels[source]} indisponível`, {
        description: "Conecte as integrações em Configurações para sincronizar dados reais.",
      });
    }, 1600);
  };

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
        campaigns={CAMPAIGNS}
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
            value={brl(m.investment)}
            source="Meta Ads"
            goal={{ label: `meta ${brl(GOALS.investimentoMensal)}`, percent: investPercent }}
          />
          <KpiCard
            icon={Coins}
            label="CPL (custo por lead)"
            value={m.leads ? brl(m.cpl) : null}
            source="Meta Ads + Planilha"
          />
          <KpiCard
            icon={Target}
            label="CPMQL (custo por MQL)"
            value={m.mqls ? brl(m.cpmql) : null}
            hint={`alvo ${brl(GOALS.cpmqlAlvo)}`}
            source="Meta Ads + Planilha"
          />
          <KpiCard
            icon={Users}
            label="Nº de Leads"
            value={num(m.leads)}
            source="Planilha"
          />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <GradeBreakdownCard a={m.gradeA} b={m.gradeB} c={m.gradeC} d={m.gradeD} />
          </div>
          <RateCard
            label="Taxa de MQL %"
            value={pct(m.mqlRate)}
            delta={m.mqlRate - p.mqlRate}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <CreativeContribTable
            title="Criativos que trouxeram Leads"
            rows={creatives}
            metric="leads"
          />
          <CreativeContribTable
            title="Criativos que trouxeram MQL"
            rows={creatives}
            metric="mqls"
          />
        </section>

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
          Dados de demonstração — conecte Google Sheets, Meta Ads e GoHighLevel em Configurações.
        </p>
      </main>
    </div>
  );
}
