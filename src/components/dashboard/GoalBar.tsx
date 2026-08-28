import { Target } from "lucide-react";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Barra full-width "como está x como deveria estar".
 * - preenche com o nº de MQL do período (`actual`)
 * - 100% da barra = meta mensal de MQL (`monthlyGoal`)
 * - marcador "deveria estar" = meta rateada pelos dias do período
 */
export function GoalBar({
  actual,
  monthlyGoal,
  spanDays,
  periodLabel,
}: {
  actual: number;
  monthlyGoal: number;
  spanDays: number;
  periodLabel: string;
}) {
  const expected = Math.round((monthlyGoal * Math.min(spanDays, 30)) / 30);
  const fillPct = monthlyGoal === 0 ? 0 : Math.min(100, (actual / monthlyGoal) * 100);
  const markerPct = monthlyGoal === 0 ? 0 : Math.min(100, (expected / monthlyGoal) * 100);
  const delta = actual - expected;
  const onPace = delta >= 0;
  const almost = !onPace && expected > 0 && actual / expected >= 0.85;

  const barColor = onPace
    ? "var(--success)"
    : almost
      ? "var(--chart-5)"
      : "var(--destructive)";

  return (
    <div className="panel flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Target className="size-4" />
          <span className="text-xs font-medium tracking-wide uppercase">
            Meta de MQL — {periodLabel}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[28px] leading-none font-bold tracking-tight tabular-nums">
            {num(actual)}
          </span>
          <span className="text-sm text-muted-foreground">
            / {num(monthlyGoal)} no mês
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="h-8 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${fillPct}%`, backgroundColor: barColor }}
          />
        </div>
        {/* marcador "deveria estar" */}
        <div
          className="absolute inset-y-0 flex flex-col items-center"
          style={{ left: `${markerPct}%`, transform: "translateX(-50%)" }}
        >
          <div className="h-8 w-0.5 bg-foreground/70" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          Deveria estar em <span className="font-semibold text-foreground">{num(expected)}</span>{" "}
          nesse período
        </span>
        <span
          className={cn(
            "font-medium",
            onPace ? "text-success" : almost ? "text-foreground" : "text-destructive",
          )}
        >
          {onPace
            ? `+${num(delta)} adiantado`
            : `${num(delta)} atrás da meta`}
        </span>
      </div>
    </div>
  );
}
