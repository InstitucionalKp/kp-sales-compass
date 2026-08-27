import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string | null;
  source: string;
  hint?: string;
  error?: string | null;
  loading?: boolean;
  highlight?: boolean;
  goal?: { label: string; percent: number } | null;
  action?: React.ReactNode;
};

export function KpiCard({
  icon: Icon,
  label,
  value,
  source,
  hint,
  error,
  loading,
  highlight,
  goal,
  action,
}: Props) {
  return (
    <div
      className={cn(
        "panel flex flex-col gap-3 p-4 transition-colors",
        highlight && "border-primary/50 bg-card ring-1 ring-primary/25",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className={cn("size-4", highlight && "text-primary")} />
          <span className="text-xs font-medium tracking-wide uppercase">{label}</span>
        </div>
        {action}
      </div>

      {loading ? (
        <Skeleton className="h-9 w-28" />
      ) : (
        <div className="flex items-end gap-2">
          <span
            className={cn(
              "text-[32px] leading-none font-bold tracking-tight",
              highlight && "text-brand-gradient text-[40px]",
              value === null && "text-muted-foreground",
            )}
          >
            {value ?? "•••"}
          </span>
          {hint ? <span className="pb-1 text-xs text-muted-foreground">{hint}</span> : null}
        </div>
      )}

      {goal ? (
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="bg-brand-gradient h-full rounded-full"
              style={{ width: `${Math.min(100, goal.percent)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {goal.percent.toFixed(0)}% da meta · {goal.label}
          </p>
        </div>
      ) : null}

      <p
        className={cn(
          "mt-auto text-[11px]",
          error ? "font-medium text-destructive" : "text-muted-foreground",
        )}
      >
        {error ?? `Fonte: ${source}`}
      </p>
    </div>
  );
}
