import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  CalendarCheck,
  CalendarClock,
  CircleDollarSign,
  FileText,
  Filter,
  Receipt,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RateCard } from "@/components/dashboard/RateCard";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { SellerRanking, type SellerRow } from "@/components/dashboard/SellerRanking";
import { OriginTable, type OriginRow } from "@/components/dashboard/OriginTable";
import { EvolutionChart, type Granularity } from "@/components/dashboard/EvolutionChart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { brl, num, pct, safeDiv } from "@/lib/format";
import {
  ORIGIN_SPEND,
  PIPELINES,
  SELLERS,
  TODAY,
  buildTimeSeries,
  computeMetrics,
  filterLeads,
  isoAgo,
  shiftRange,
} from "@/lib/mock-data";

const GOAL_REVENUE = 250000;
const GOAL_SALES = 20;

type Search = {
  vendedor: string;
  pipeline: string;
  de: string;
  ate: string;
  preset: number | null;
  gran: Granularity;
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard Comercial | KP Assessoria" },
      {
        name: "description",
        content:
          "Funil de vendas da KP Assessoria: leads, MQLs, reuniões, propostas, vendas e receita em tempo real.",
      },
      { property: "og:title", content: "Dashboard Comercial | KP Assessoria" },
      {
        property: "og:description",
        content: "Acompanhe o funil comercial do lead à venda fechada, com dados de GHL, Meta Ads e planilha.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    vendedor: typeof s['vendedor'] === "string" ? s['vendedor'] : "todos",
    pipeline: typeof s['pipeline'] === "string" ? s['pipeline'] : "todos",
    de: typeof s['de'] === "string" ? s['de'] : isoAgo(TODAY, 29),
    ate: typeof s['ate'] === "string" ? s['ate'] : TODAY,
    preset: s['preset'] === null || s['preset'] === undefined ? 30 : Number(s['preset']) || null,
    gran: s['gran'] === "semana" || s['gran'] === "mes" ? s['gran'] : "dia",
  }),
  component: Dashboard,
});

function Dashboard() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const [syncing, setSyncing] = useState<string | null>(null);
  const [leadsSource, setLeadsSource] = useState<"GHL" | "Planilha">("GHL");
  const [mqlSource, setMqlSource] = useState<"GHL" | "Planilha">("Planilha");

  const setSearch = (patch: Partial<Search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  const rows = useMemo(
    () =>
      filterLeads({
        from: search.de,
        to: search.ate,
        seller: search.vendedor,
        pipeline: search.pipeline,
      }),
    [search.de, search.ate, search.vendedor, search.pipeline],
  );

  const prevRows = useMemo(() => {
    const r = shiftRange(search.de, search.ate);
    return filterLeads({ ...r, seller: search.vendedor, pipeline: search.pipeline });
  }, [search.de, search.ate, search.vendedor, search.pipeline]);

  const m = useMemo(() => computeMetrics(rows), [rows]);
  const p = useMemo(() => computeMetrics(prevRows), [prevRows]);

  const series = useMemo(
    () => buildTimeSeries(rows, search.de, search.ate, search.gran),
    [rows, search.de, search.ate, search.gran],
  );

  const sellerRows: SellerRow[] = useMemo(() => {
    return SELLERS.map((s) => {
      const own = rows.filter((r) => r.seller === s);
      const mm = computeMetrics(own);
      return {
        seller: s,
        sales: mm.won,
        revenue: mm.revenue,
        conversion: safeDiv(mm.won, mm.leads),
        ticket: mm.ticket,
      };
    }).filter((r) => r.sales > 0 || search.vendedor === "todos");
  }, [rows, search.vendedor]);

  const leadOrigins: OriginRow[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.origin, (map.get(r.origin) ?? 0) + 1);
    return [...map.entries()]
      .map(([origin, qty]) => ({
        origin,
        qty,
        cost: (ORIGIN_SPEND[origin] ?? 0) > 0 ? (ORIGIN_SPEND[origin] ?? 0) / 2 / qty : 0,
      }))
      .sort((a, b) => b.qty - a.qty);
  }, [rows]);

  const saleOrigins: OriginRow[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows.filter((r) => r.won)) map.set(r.origin, (map.get(r.origin) ?? 0) + 1);
    return [...map.entries()]
      .map(([origin, qty]) => ({
        origin,
        qty,
        cost: (ORIGIN_SPEND[origin] ?? 0) > 0 ? (ORIGIN_SPEND[origin] ?? 0) / 2 / qty : 0,
      }))
      .sort((a, b) => b.qty - a.qty);
  }, [rows]);

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

  const funnel = [
    { label: "Leads", value: m.leads },
    { label: "MQLs", value: m.mqls },
    { label: "Reuniões Agendadas", value: m.scheduled },
    { label: "Reuniões Realizadas", value: m.held },
    { label: "Propostas", value: m.proposals },
    { label: "Vendas", value: m.won },
  ];

  const SourcePicker = ({
    value,
    onChange,
  }: {
    value: "GHL" | "Planilha";
    onChange: (v: "GHL" | "Planilha") => void;
  }) => (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-md border border-border px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground">
        {value}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onChange("GHL")}>GHL</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChange("Planilha")}>Planilha</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="min-h-screen">
      <AppHeader />
      <FilterBar
        filters={{
          seller: search.vendedor,
          pipeline: search.pipeline,
          from: search.de,
          to: search.ate,
          preset: search.preset,
        }}
        sellers={SELLERS}
        pipelines={PIPELINES}
        syncing={syncing}
        onChange={(patch) =>
          setSearch({
            ...(patch.seller !== undefined ? { vendedor: patch.seller } : {}),
            ...(patch.pipeline !== undefined ? { pipeline: patch.pipeline } : {}),
            ...(patch.from !== undefined ? { de: patch.from } : {}),
            ...(patch.to !== undefined ? { ate: patch.to } : {}),
            ...(patch.preset !== undefined ? { preset: patch.preset } : {}),
          })
        }
        onPreset={(d) => setSearch({ preset: d, de: isoAgo(TODAY, d - 1), ate: TODAY })}
        onSync={handleSync}
      />

      <main className="mx-auto flex max-w-[1600px] flex-col gap-4 p-4">
        <h1 className="sr-only">Dashboard comercial KP Assessoria</h1>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={Users}
            label="Leads Recebidos"
            value={num(m.leads)}
            source={leadsSource}
            action={<SourcePicker value={leadsSource} onChange={setLeadsSource} />}
          />
          <KpiCard
            icon={Filter}
            label="MQLs"
            value={num(m.mqls)}
            source={mqlSource}
            action={<SourcePicker value={mqlSource} onChange={setMqlSource} />}
          />
          <KpiCard icon={CalendarClock} label="Reuniões Agendadas" value={num(m.scheduled)} source="GHL" />
          <KpiCard
            icon={CalendarCheck}
            label="Reuniões Realizadas"
            value={num(m.held)}
            hint={`no-show ${pct(m.noShowRate, 0)}`}
            source="GHL"
          />

          <KpiCard icon={FileText} label="Propostas Enviadas" value={num(m.proposals)} source="GHL" />
          <KpiCard
            icon={BadgeCheck}
            label="Vendas Fechadas"
            value={num(m.won)}
            source="GHL"
            highlight
            goal={{ label: `meta ${GOAL_SALES}`, percent: (m.won / GOAL_SALES) * 100 }}
          />
          <KpiCard
            icon={CircleDollarSign}
            label="Receita Fechada"
            value={brl(m.revenue)}
            source="GHL"
            goal={{ label: `meta ${brl(GOAL_REVENUE)}`, percent: (m.revenue / GOAL_REVENUE) * 100 }}
          />
          <KpiCard icon={Receipt} label="Ticket Médio" value={m.won ? brl(m.ticket) : null} source="GHL" />
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <RateCard
            label="Lead → MQL"
            value={pct(safeDiv(m.mqls, m.leads))}
            delta={safeDiv(m.mqls, m.leads) - safeDiv(p.mqls, p.leads)}
          />
          <RateCard
            label="MQL → Reunião Agendada"
            value={pct(safeDiv(m.scheduled, m.mqls))}
            delta={safeDiv(m.scheduled, m.mqls) - safeDiv(p.scheduled, p.mqls)}
          />
          <RateCard
            label="Reunião Realizada → Proposta"
            value={pct(safeDiv(m.proposals, m.held))}
            delta={safeDiv(m.proposals, m.held) - safeDiv(p.proposals, p.held)}
          />
          <RateCard
            label="Proposta → Venda"
            value={pct(safeDiv(m.won, m.proposals))}
            delta={safeDiv(m.won, m.proposals) - safeDiv(p.won, p.proposals)}
          />
          <RateCard
            label="Conversão Geral Lead → Venda"
            value={pct(safeDiv(m.won, m.leads))}
            delta={safeDiv(m.won, m.leads) - safeDiv(p.won, p.leads)}
          />
          <RateCard
            label="Ciclo de Vendas Médio (dias)"
            value={m.cycleDays ? m.cycleDays.toFixed(1) : "•••"}
            delta={m.cycleDays - p.cycleDays}
            invert
          />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <FunnelChart steps={funnel} />
          <SellerRanking rows={sellerRows} />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <OriginTable title="Leads por Origem" rows={leadOrigins} costLabel="CPL" />
          <OriginTable title="Vendas por Origem" rows={saleOrigins} costLabel="CAC" />
        </section>

        <EvolutionChart
          data={series}
          granularity={search.gran}
          onGranularityChange={(gran) => setSearch({ gran })}
        />

        <p className="flex items-center justify-center gap-2 pb-6 text-xs text-muted-foreground">
          <Trophy className="size-3.5" />
          Dados de demonstração — conecte GHL, Meta Ads e Google Sheets em Configurações.
        </p>
      </main>
    </div>
  );
}
