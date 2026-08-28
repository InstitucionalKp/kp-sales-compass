import { Fragment, useState } from "react";
import { BadgeCheck, ChevronDown, ChevronRight, Play } from "lucide-react";
import type { CreativeStats, Lead } from "@/lib/mock-data";
import { num, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

const GRADE_COLOR: Record<Lead["grade"], string> = {
  A: "var(--success)",
  B: "var(--brand-2)",
  C: "var(--chart-lead)",
  D: "var(--muted-foreground)",
};

function GradeBadge({ grade }: { grade: Lead["grade"] }) {
  return (
    <span
      className="inline-flex min-w-5 items-center justify-center rounded border px-1 text-[10px] font-semibold"
      style={{ color: GRADE_COLOR[grade], borderColor: GRADE_COLOR[grade] }}
    >
      {grade}
    </span>
  );
}

function VideoThumb({ url, name }: { url: string; name: string }) {
  if (!url) {
    return (
      <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground">
        s/ vídeo
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={`Ver demo do vídeo — ${name}`}
      className="bg-brand-gradient flex h-9 w-12 shrink-0 items-center justify-center rounded-md text-primary-foreground transition-opacity hover:opacity-90"
      onClick={(e) => e.stopPropagation()}
    >
      <Play className="size-4 fill-current" />
    </a>
  );
}

function fmtDateTime(l: Lead) {
  const d = new Date(`${l.date}T12:00:00`);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${l.time}`;
}

export function CreativeContribTable({
  title,
  rows,
  metric,
}: {
  title: string;
  rows: CreativeStats[];
  metric: "leads" | "mqls";
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const metricLabel = metric === "leads" ? "Leads" : "MQL";
  const data = rows
    .map((r) => ({
      ...r,
      value: metric === "leads" ? r.leads : r.mqls,
      list: metric === "leads" ? r.leadList : r.leadList.filter((l) => l.isMql),
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalValue = data.reduce((s, r) => s + r.value, 0);

  return (
    <div className="panel flex h-full flex-col p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="text-[11px] tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="pb-2 text-left font-medium">Criativo</th>
              <th className="pb-2 text-right font-medium">{metricLabel}</th>
              <th className="pb-2 text-right font-medium">% do total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => {
              const isOpen = !!open[r.name];
              return (
                <Fragment key={r.name}>
                  <tr
                    className="cursor-pointer border-t border-border/60 hover:bg-muted/30"
                    onClick={() => toggle(r.name)}
                  >
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        {isOpen ? (
                          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <VideoThumb url={r.videoUrl} name={r.name} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-medium">
                            {r.name}
                            {r.sold ? (
                              <BadgeCheck className="size-3.5 shrink-0 text-success" />
                            ) : null}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">{r.campaign}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">{num(r.value)}</td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {totalValue === 0 ? "—" : pct((r.value / totalValue) * 100, 0)}
                    </td>
                  </tr>

                  {isOpen ? (
                    <tr className="border-t border-border/60 bg-muted/20">
                      <td colSpan={3} className="p-0">
                        <div className="max-h-[260px] overflow-y-auto px-3 py-2">
                          <p className="mb-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                            {r.adset} · A {r.gradeA} · B {r.gradeB} · C {r.gradeC} · D {r.gradeD}
                          </p>
                          <table className="w-full text-xs">
                            <tbody>
                              {r.list.map((l) => (
                                <tr key={l.id} className="border-t border-border/40">
                                  <td className="w-24 py-1.5 text-muted-foreground tabular-nums">
                                    {fmtDateTime(l)}
                                  </td>
                                  <td className="py-1.5">
                                    <span className="font-medium">{l.name}</span>
                                    <span className="text-muted-foreground"> · {l.company}</span>
                                  </td>
                                  <td className="w-10 py-1.5 text-center">
                                    <GradeBadge grade={l.grade} />
                                  </td>
                                </tr>
                              ))}
                              {r.list.length === 0 ? (
                                <tr>
                                  <td className="py-3 text-center text-muted-foreground">
                                    Nenhum lead no período.
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {data.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-muted-foreground">
                  •••
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className={cn("mt-3 text-[11px] text-muted-foreground")}>
        {metric === "leads"
          ? "Leads da Planilha · selo verde = criativo com venda no GHL"
          : "MQL = leads qualificação A ou B · selo verde = criativo com venda no GHL"}
      </p>
    </div>
  );
}
