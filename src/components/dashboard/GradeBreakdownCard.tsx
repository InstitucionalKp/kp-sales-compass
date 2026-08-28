import { Layers } from "lucide-react";

type Grade = { key: "A" | "B" | "C" | "D"; label: string; value: number; color: string };

export function GradeBreakdownCard({
  a,
  b,
  c,
  d,
  source = "Planilha",
}: {
  a: number;
  b: number;
  c: number;
  d: number;
  source?: string;
}) {
  const grades: Grade[] = [
    { key: "A", label: "Lead A", value: a, color: "var(--success)" },
    { key: "B", label: "Lead B", value: b, color: "var(--brand-2)" },
    { key: "C", label: "Lead C", value: c, color: "var(--chart-lead)" },
    { key: "D", label: "Lead D", value: d, color: "var(--muted-foreground)" },
  ];
  const total = a + b + c + d;

  return (
    <div className="panel flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Layers className="size-4" />
        <span className="text-xs font-medium tracking-wide uppercase">Leads ABCD</span>
      </div>

      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
        {grades.map((g) =>
          g.value > 0 ? (
            <div
              key={g.key}
              style={{
                width: `${total === 0 ? 0 : (g.value / total) * 100}%`,
                backgroundColor: g.color,
              }}
            />
          ) : null,
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {grades.map((g) => (
          <div key={g.key} className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: g.color }}
              />
              {g.key}
            </span>
            <span className="text-lg font-bold tracking-tight tabular-nums">{g.value}</span>
          </div>
        ))}
      </div>

      <p className="mt-auto text-[11px] text-muted-foreground">
        Fonte: {source} · MQL = A + B ({a + b})
      </p>
    </div>
  );
}
