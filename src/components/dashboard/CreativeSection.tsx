import { useMemo, useState } from "react";
import { Activity, Megaphone, Target, TrendingUp, Users } from "lucide-react";
import type { CreativeStats, Lead } from "@/lib/mock-data";
import { brl, num, pct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

type Metric = "leads" | "mqls" | "roi";

const GRADE_COLOR: Record<Lead["grade"], string> = {
  A: "var(--success)",
  B: "var(--brand-2)",
  C: "var(--chart-lead)",
  D: "var(--muted-foreground)",
};

function Dot({ on }: { on: boolean }) {
  return (
    <span
      className="size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: on ? "var(--success)" : "var(--muted-foreground)", opacity: on ? 1 : 0.4 }}
      title={on ? "Gerou venda" : "Sem venda"}
    />
  );
}

function GradeBadge({ grade }: { grade: Lead["grade"] }) {
  return (
    <span
      className="inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-primary-foreground"
      style={{ backgroundColor: GRADE_COLOR[grade] }}
    >
      {grade}
    </span>
  );
}

function fmtDateTime(l: Lead) {
  const d = new Date(`${l.date}T12:00:00`);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${l.time}`;
}

function MiniTable({
  title,
  icon: Icon,
  accent,
  metric,
  rows,
  onSelect,
}: {
  title: string;
  icon: typeof Users;
  accent: string;
  metric: Metric;
  rows: CreativeStats[];
  onSelect: (c: CreativeStats) => void;
}) {
  const data = useMemo(() => {
    const mapped = rows.map((r) => ({
      row: r,
      value: metric === "leads" ? r.leads : metric === "mqls" ? r.mqls : r.roi,
    }));
    if (metric === "roi") {
      // só criativos que tiveram investimento E leads no período
      return mapped
        .filter((d) => d.row.investment > 0 && d.row.leads > 0)
        .sort((a, b) => b.value - a.value);
    }
    return mapped.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  }, [rows, metric]);

  const total = metric === "roi" ? 0 : data.reduce((s, d) => s + d.value, 0);
  const maxBar = Math.max(1, ...data.map((d) => Math.abs(d.value)));

  const valueLabel = metric === "roi" ? "ROI" : "Qtd";
  const trailLabel = metric === "roi" ? "Receita" : "%";

  return (
    <div className="panel flex h-full min-w-0 flex-col p-4">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 shrink-0" style={{ color: accent }} />
        {title}
      </h2>

      <div className="flex items-center gap-2 pb-1 text-[10px] tracking-wide text-muted-foreground uppercase">
        <span className="w-4 shrink-0">#</span>
        <span className="flex-1">Criativo</span>
        <span className="w-12 shrink-0 text-right">{valueLabel}</span>
        <span className="w-16 shrink-0 text-right">{trailLabel}</span>
      </div>

      <div className="max-h-[360px] overflow-y-auto">
        {data.map((d, i) => {
          const r = d.row;
          const info =
            metric === "leads"
              ? `CPL ${brl(r.cpl)}`
              : metric === "mqls"
                ? `CPMQL ${brl(r.cpmql)}`
                : `Inv. ${brl(r.investment)}`;
          return (
            <button
              key={r.name}
              type="button"
              onClick={() => onSelect(r)}
              className="flex w-full items-center gap-2 border-t border-border/60 py-2 text-left transition-colors hover:bg-muted/30"
            >
              <span className="w-4 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
              <Dot on={r.sold} />
              <span className="min-w-0 flex-1">
                <span className="relative block">
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 rounded-sm"
                    style={{
                      width: `${(Math.abs(d.value) / maxBar) * 100}%`,
                      backgroundColor: accent,
                      opacity: 0.16,
                    }}
                  />
                  <span className="relative block truncate text-sm">{r.name}</span>
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">{info}</span>
              </span>
              <span
                className={cn(
                  "w-12 shrink-0 text-right text-sm font-semibold tabular-nums",
                  metric === "roi" && (d.value >= 0 ? "text-success" : "text-destructive"),
                )}
              >
                {metric === "roi" ? `${d.value > 0 ? "+" : ""}${d.value.toFixed(0)}%` : num(d.value)}
              </span>
              <span className="w-16 shrink-0 truncate text-right text-xs text-muted-foreground tabular-nums">
                {metric === "roi"
                  ? brl(r.revenue)
                  : total === 0
                    ? "—"
                    : pct((d.value / total) * 100, 0)}
              </span>
            </button>
          );
        })}
        {data.length === 0 ? (
          <p className="border-t border-border/60 py-6 text-center text-muted-foreground">•••</p>
        ) : null}
      </div>
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="panel bg-card/60 flex flex-col gap-1 p-3">
      <span className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="text-2xl font-bold tracking-tight tabular-nums">{value}</span>
      <span className="text-[11px] text-muted-foreground">{sub}</span>
    </div>
  );
}

function DetailDialog({
  creative,
  onClose,
}: {
  creative: CreativeStats | null;
  onClose: () => void;
}) {
  const [onlyMql, setOnlyMql] = useState(false);
  const c = creative;

  const leadsShown = useMemo(() => {
    if (!c) return [];
    return onlyMql ? c.leadList.filter((l) => l.isMql) : c.leadList;
  }, [c, onlyMql]);

  if (!c) return null;

  const typeCpl = (n: number) => (n === 0 ? brl(0) : brl(c.investment / n));
  const grades: { key: Lead["grade"]; n: number }[] = [
    { key: "A", n: c.gradeA },
    { key: "B", n: c.gradeB },
    { key: "C", n: c.gradeC },
    { key: "D", n: c.gradeD },
  ];

  return (
    <Dialog open={!!creative} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Dot on={c.sold} />
            <span className="truncate">{c.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="panel bg-card/60 flex items-center gap-2 p-3 text-sm">
            <Megaphone className="size-4 text-primary" />
            Investimento no Criativo: <strong>{brl(c.investment)}</strong>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Total Leads" value={num(c.leads)} sub={`CPL Geral: ${brl(c.cpl)}`} />
            <StatBox label="Total MQLs" value={num(c.mqls)} sub={`CPMQL: ${brl(c.cpmql)}`} />
          </div>

          {c.investment > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              <StatBox label="ROI" value={`${c.roi > 0 ? "+" : ""}${c.roi.toFixed(0)}%`} sub={brl(c.revenue)} />
              <StatBox label="Vendas" value={num(c.saleCount)} sub="do GHL" />
              <StatBox label="Receita" value={brl(c.revenue)} sub="vendas casadas" />
            </div>
          ) : null}

          <div className="panel bg-card/60 p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold">
              <Activity className="size-3.5 text-primary" /> Qualificação
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {grades.map((g) => (
                <div key={g.key} className="flex flex-col gap-0.5">
                  <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                    Tipo {g.key}
                  </span>
                  <span
                    className="text-xl font-bold tabular-nums"
                    style={{ color: GRADE_COLOR[g.key] }}
                  >
                    {g.n}
                  </span>
                  <span className="text-[10px] text-muted-foreground">CPL: {typeCpl(g.n)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-2 px-1 text-xs">
            <span className="text-muted-foreground">
              Taxa MQL: <span className="font-semibold text-foreground">{pct(c.mqlRate)}</span>
            </span>
            <span className="text-muted-foreground">
              CPC: <span className="font-semibold text-foreground">{c.cpc > 0 ? brl(c.cpc) : "—"}</span>
            </span>
            <span className="text-muted-foreground">
              CPM: <span className="font-semibold text-foreground">{c.cpm > 0 ? brl(c.cpm) : "—"}</span>
            </span>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-2 text-xs font-semibold">
                <Users className="size-3.5 text-primary" /> Lista de Leads ({leadsShown.length})
              </p>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                Somente MQLs
                <Switch checked={onlyMql} onCheckedChange={setOnlyMql} />
              </label>
            </div>
            <div className="max-h-[280px] space-y-2 overflow-y-auto">
              {leadsShown.map((l) => (
                <div key={l.id} className="panel bg-card/40 p-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{l.name}</span>
                    {l.isMql ? <GradeBadge grade={l.grade} /> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                    {l.company ? <span>Empresa: {l.company}</span> : null}
                    {l.meetingStatus ? <span>Reunião: {l.meetingStatus}</span> : null}
                    {l.vende ? <span>Faturamento: {l.vende}</span> : null}
                    <span className="text-muted-foreground/60">{fmtDateTime(l)}</span>
                  </div>
                </div>
              ))}
              {leadsShown.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">Nenhum lead.</p>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CreativeSection({
  rows,
  periodLabel,
}: {
  rows: CreativeStats[];
  periodLabel: string;
}) {
  const [selected, setSelected] = useState<CreativeStats | null>(null);

  return (
    <>
      <p className="-mb-1 text-xs text-muted-foreground">
        Criativos com atividade no período: <strong className="text-foreground">{periodLabel}</strong>
      </p>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MiniTable
          title="Leads por Criativo"
          icon={Users}
          accent="var(--chart-lead)"
          metric="leads"
          rows={rows}
          onSelect={setSelected}
        />
        <MiniTable
          title="MQLs por Criativo"
          icon={Target}
          accent="var(--brand-2)"
          metric="mqls"
          rows={rows}
          onSelect={setSelected}
        />
        <MiniTable
          title="Criativos que trazem ROI"
          icon={TrendingUp}
          accent="var(--success)"
          metric="roi"
          rows={rows}
          onSelect={setSelected}
        />
      </section>
      <DetailDialog creative={selected} onClose={() => setSelected(null)} />
    </>
  );
}
