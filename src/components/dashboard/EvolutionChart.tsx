import {
  Area,
  ComposedChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ddmm, dateLabel, num } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Point = { date: string; leads: number; mqls: number };
export type Granularity = "dia" | "semana" | "mes";

export function EvolutionChart({
  data,
  granularity,
  onGranularityChange,
}: {
  data: Point[];
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
}) {
  return (
    <div className="panel p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Evolução Temporal</h2>
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {(["dia", "semana", "mes"] as const).map((g) => (
            <button
              key={g}
              onClick={() => onGranularityChange(g)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                granularity === g
                  ? "bg-brand-gradient text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {g === "mes" ? "mês" : g}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-lead)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-lead)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gMql" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand-2)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--brand-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={ddmm}
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={38}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelFormatter={(l: string) => dateLabel(l)}
              formatter={(value: number, name: string) => [num(value), name]}
            />
            <Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="leads"
              name="Leads Tráfego"
              stroke="var(--chart-lead)"
              strokeWidth={2}
              fill="url(#gLeads)"
            />
            <Area
              type="monotone"
              dataKey="mqls"
              name="MQL"
              stroke="var(--brand-2)"
              strokeWidth={2}
              fill="url(#gMql)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
