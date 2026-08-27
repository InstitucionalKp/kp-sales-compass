import { brl, num } from "@/lib/format";

export type OriginRow = { origin: string; qty: number; cost: number };

export function OriginTable({
  title,
  rows,
  costLabel,
}: {
  title: string;
  rows: OriginRow[];
  costLabel: "CPL" | "CAC";
}) {
  const max = Math.max(1, ...rows.map((r) => r.qty));

  return (
    <div className="panel flex h-full flex-col p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="max-h-[300px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="w-8 pb-2 text-left font-medium">#</th>
              <th className="pb-2 text-left font-medium">Origem</th>
              <th className="pb-2 text-left font-medium">Info</th>
              <th className="pb-2 text-right font-medium">Qtd.</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((r, i) => (
              <tr key={r.origin} className="border-t border-border/60">
                <td className="py-2 text-xs text-muted-foreground">{i + 1}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="bg-brand-gradient h-5 w-1.5 shrink-0 rounded-full"
                      style={{ opacity: 0.35 + (r.qty / max) * 0.65 }}
                    />
                    <span className="truncate">{r.origin}</span>
                  </div>
                </td>
                <td className="py-2 text-xs text-muted-foreground">
                  {r.cost > 0 ? `${costLabel}: ${brl(r.cost)}` : "—"}
                </td>
                <td className="py-2 text-right font-semibold">{num(r.qty)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-muted-foreground">
                  •••
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
