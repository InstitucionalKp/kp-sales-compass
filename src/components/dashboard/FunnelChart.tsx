import { num, pct, safeDiv } from "@/lib/format";

export type FunnelStep = { label: string; value: number };

export function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1);

  return (
    <div className="panel flex h-full flex-col gap-3 p-4">
      <h2 className="text-sm font-semibold">Funil de Vendas</h2>
      <div className="flex flex-col gap-2">
        {steps.map((s, i) => {
          const width = Math.max(12, (s.value / top) * 100);
          const prev = i === 0 ? null : steps[i - 1]!.value;
          const retention = prev === null ? 100 : safeDiv(s.value, prev);
          return (
            <div key={s.label} className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-xs text-muted-foreground">{s.label}</span>
              <div className="relative h-10 flex-1 overflow-hidden rounded-md bg-muted/40">
                <div
                  className="flex h-full items-center justify-between rounded-md px-3"
                  style={{
                    width: `${width}%`,
                    background: `linear-gradient(90deg, var(--brand), var(--brand-2))`,
                    opacity: 1 - i * 0.11,
                  }}
                >
                  <span className="text-sm font-bold text-primary-foreground">{num(s.value)}</span>
                </div>
              </div>
              <span className="w-16 shrink-0 text-right text-xs font-medium text-muted-foreground">
                {i === 0 ? "100%" : pct(retention, 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
