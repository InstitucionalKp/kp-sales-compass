import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function RateCard({
  label,
  value,
  delta,
  invert,
}: {
  label: string;
  value: string;
  delta: number;
  invert?: boolean;
}) {
  const flat = Math.abs(delta) < 0.1;
  const good = invert ? delta < 0 : delta > 0;
  const Icon = flat ? Minus : good ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="panel flex flex-col gap-1.5 p-3">
      <span className="text-[11px] leading-tight text-muted-foreground">{label}</span>
      <span className="text-xl font-bold tracking-tight">{value}</span>
      <span
        className={cn(
          "flex items-center gap-1 text-[11px] font-medium",
          flat ? "text-muted-foreground" : good ? "text-success" : "text-destructive",
        )}
      >
        <Icon className="size-3" />
        {flat ? "estável" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} vs. período anterior`}
      </span>
    </div>
  );
}
