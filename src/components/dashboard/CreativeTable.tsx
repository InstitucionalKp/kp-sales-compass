import { Fragment, useState } from "react";
import { BadgeCheck, ChevronDown, ChevronRight, Play } from "lucide-react";
import type { CreativeStats } from "@/lib/mock-data";
import type { Lead } from "@/lib/mock-data";
import { brl, num, pct } from "@/lib/format";
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
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={`Ver demo do vídeo — ${name}`}
      className="bg-brand-gradient flex h-9 w-14 shrink-0 items-center justify-center rounded-md text-primary-foreground transition-opacity hover:opacity-90"
      onClick={(e) => e.stopPropagation()}
    >
      <Play className="size-4 fill-current" />
    </a>
  );
}

function fmtDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function CreativeTable({ rows }: { rows: CreativeStats[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  return (
    <div className="panel flex flex-col p-4">
      <h2 className="mb-3 text-sm font-semibold">Desempenho por Criativo</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-[11px] tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="pb-2 text-left font-medium">Criativo</th>
              <th className="pb-2 text-right font-medium">Leads</th>
              <th className="pb-2 text-right font-medium">MQL</th>
              <th className="pb-2 text-right font-medium">Taxa MQL</th>
              <th className="pb-2 text-right font-medium">Investimento</th>
              <th className="pb-2 text-right font-medium">CPMQL</th>
              <th className="pb-2 text-center font-medium">Vendeu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isOpen = !!open[r.creative.id];
              return (
                <Fragment key={r.creative.id}>
                  <tr
                    className="cursor-pointer border-t border-border/60 hover:bg-muted/30"
                    onClick={() => toggle(r.creative.id)}
                  >
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        {isOpen ? (
                          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <VideoThumb url={r.creative.videoUrl} name={r.creative.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{r.creative.name}</p>
                          <p className="text-[11px] text-muted-foreground">{r.creative.channel}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">{num(r.leads)}</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">{num(r.mqls)}</td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {pct(r.mqlRate)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {r.investment > 0 ? brl(r.investment) : "—"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {r.cpmql > 0 ? brl(r.cpmql) : "—"}
                    </td>
                    <td className="py-2.5 text-center">
                      {r.sold ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                          <BadgeCheck className="size-3.5" /> Sim
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>

                  {isOpen ? (
                    <tr className="border-t border-border/60 bg-muted/20">
                      <td colSpan={7} className="p-0">
                        <div className="max-h-[280px] overflow-y-auto px-3 py-2">
                          <p className="mb-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                            Leads deste criativo ({r.leadList.length}) · A {r.gradeA} · B {r.gradeB} · C{" "}
                            {r.gradeC} · D {r.gradeD}
                          </p>
                          <table className="w-full text-xs">
                            <tbody>
                              {r.leadList.map((l) => (
                                <tr key={l.id} className="border-t border-border/40">
                                  <td className="w-14 py-1.5 text-muted-foreground tabular-nums">
                                    {fmtDate(l.date)}
                                  </td>
                                  <td className="py-1.5">{l.name}</td>
                                  <td className="w-10 py-1.5 text-center">
                                    <GradeBadge grade={l.grade} />
                                  </td>
                                  <td className="py-1.5 text-muted-foreground">{l.channel}</td>
                                  <td className="w-16 py-1.5 text-right">
                                    {l.sold ? (
                                      <span className="text-success">venda</span>
                                    ) : l.isMql ? (
                                      <span className="text-muted-foreground">MQL</span>
                                    ) : (
                                      <span className="text-muted-foreground/60">lead</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              {r.leadList.length === 0 ? (
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted-foreground">
                  •••
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className={cn("mt-3 text-[11px] text-muted-foreground")}>
        Leads e MQL da Planilha · Investimento do Meta Ads · selo "Vendeu" do GoHighLevel
      </p>
    </div>
  );
}
