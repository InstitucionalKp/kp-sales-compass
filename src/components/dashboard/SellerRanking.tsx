import { useState } from "react";
import { ArrowUpDown, Trophy } from "lucide-react";
import { brl, num, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SellerRow = {
  seller: string;
  sales: number;
  revenue: number;
  conversion: number;
  ticket: number;
};

type Key = keyof Omit<SellerRow, "seller">;

export function SellerRanking({ rows }: { rows: SellerRow[] }) {
  const [sort, setSort] = useState<Key>("revenue");
  const sorted = [...rows].sort((a, b) => b[sort] - a[sort]);
  const max = Math.max(1, ...rows.map((r) => r.revenue));

  const Th = ({ k, label, align = "right" }: { k: Key; label: string; align?: string }) => (
    <th className={cn("pb-2 font-medium", align === "right" ? "text-right" : "text-left")}>
      <button
        onClick={() => setSort(k)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          sort === k && "text-primary",
        )}
      >
        {label}
        <ArrowUpDown className="size-3" />
      </button>
    </th>
  );

  return (
    <div className="panel flex h-full flex-col p-4">
      <h2 className="mb-3 text-sm font-semibold">Ranking de Vendedores</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[11px] tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="w-8 pb-2 text-left font-medium">#</th>
              <th className="pb-2 text-left font-medium">Vendedor</th>
              <Th k="sales" label="Vendas" />
              <Th k="revenue" label="Receita" />
              <Th k="conversion" label="Conv. %" />
              <Th k="ticket" label="Ticket Médio" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.seller} className="border-t border-border/60">
                <td className="py-2.5 text-xs text-muted-foreground">{i + 1}</td>
                <td className="py-2.5">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    {i === 0 ? <Trophy className="size-3.5 text-primary" /> : null}
                    {r.seller}
                  </span>
                </td>
                <td className="py-2.5 text-right font-semibold">{num(r.sales)}</td>
                <td className="relative py-2.5 text-right">
                  <span
                    className="bg-brand-gradient absolute inset-y-1 right-0 rounded-sm opacity-20"
                    style={{ width: `${(r.revenue / max) * 100}%` }}
                  />
                  <span className="relative font-medium">{brl(r.revenue)}</span>
                </td>
                <td className="py-2.5 text-right text-muted-foreground">{pct(r.conversion)}</td>
                <td className="py-2.5 text-right text-muted-foreground">{brl(r.ticket)}</td>
              </tr>
            ))}
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-muted-foreground">
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
