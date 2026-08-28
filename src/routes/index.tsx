import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Flame, Info, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RateCard } from "@/components/dashboard/RateCard";
import { GradeBreakdownCard } from "@/components/dashboard/GradeBreakdownCard";
import { CreativeTable } from "@/components/dashboard/CreativeTable";
import { OriginTable, type OriginRow } from "@/components/dashboard/OriginTable";
import { EvolutionChart } from "@/components/dashboard/EvolutionChart";
import type { Granularity } from "@/lib/dashboard-search";
import { brl, num, pct } from "@/lib/format";
import {
  CHANNELS,
  TODAY,
  buildTimeSeries,
  channelBreakdown,
  computeMetrics,
  creativeBreakdown,
  filterLeads,
  filterSpend,
  isoAgo,
  shiftRange,
} from "@/lib/mock-data";

type Search = {
  canal: string;
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
          "Dashboard de marketing da KP Assessoria: investimento em tráfego, leads, MQL, custo por MQL e desempenho por criativo.",
      },
      { property: "og:title", content: "Dashboard de Marketing | KP Assessoria" },
      {
        property: "og:description",
        content:
          "Investimento em tráfego, leads e MQL da planilha, CPMQL e desempenho por criativo em tempo real.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    canal: typeof s["canal"] === "string" ? s["canal"] : "todos",
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
    () => filterLeads({ from: search.de, to: search.ate, channel: search.canal }),
    [search.de, search.ate, search.canal],
  );
  const spend = useMemo(
    () => filterSpend({ from: search.de, to: search.ate, channel: search.canal }),
    [search.de, search.ate, search.canal],
  );

  const prev = useMemo(() => {
    const r = shiftRange(search.de, search.ate);
    return {
      leads: filterLeads({ ...r, channel: search.canal }),
      spend: filterSpend({ ...r, channel: search.canal }),
    };
  }, [search.de, search.ate, search.canal]);

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
          channel: search.canal,
          from: search.de,
          to: search.ate,
          preset: search.preset,
        }}
        channels={CHANNELS}
        syncing={syncing}
        onChange={(patch) =>
          setSearch({
            ...(patch.channel !== undefined ? { canal: patch.channel } : {}),
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

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={Wallet}
            label="Investimento em Tráfego"
            value={brl(m.investment)}
            source="Meta Ads"
          />
          <KpiCard
            icon={Users}
            label="Leads Tráfego"
            value={num(m.leads)}
            source="Planilha"
          />
          <KpiCard
            icon={Flame}
            label="Total de MQL"
            value={num(m.mqls)}
            hint={`A ${m.gradeA} · B ${m.gradeB}`}
            source="Planilha"
          />
          <GradeBreakdownCard a={m.gradeA} b={m.gradeB} c={m.gradeC} d={m.gradeD} />
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <RateCard
            label="Taxa de MQL %"
            value={pct(m.mqlRate)}
            delta={m.mqlRate - p.mqlRate}
          />
          <RateCard
            label="CPMQL (custo por MQL)"
            value={m.mqls ? brl(m.cpmql) : "•••"}
            delta={m.cpmql - p.cpmql}
            invert
          />
          <RateCard
            label="CPL (custo por lead)"
            value={m.leads ? brl(m.cpl) : "•••"}
            delta={m.cpl - p.cpl}
            invert
          />
        </section>

        <CreativeTable rows={creatives} />

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
