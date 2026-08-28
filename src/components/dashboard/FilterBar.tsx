import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronDown,
  Loader2,
  RefreshCw,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dateLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Filters = {
  /** vazio = todas */
  campaigns: string[];
  from: string;
  to: string;
  preset: number | null;
};

const PRESETS = [7, 15, 30, 60];

function MultiSelect({
  label,
  selected,
  options,
  onChange,
}: {
  label: string;
  selected: string[];
  options: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (o: string) =>
    onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]);

  const text =
    selected.length === 0
      ? "Todas"
      : selected.length === 1
        ? (selected[0] ?? "Todas")
        : `${selected.length} campanhas`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[280px] gap-2">
          <span className="text-muted-foreground">{label}:</span>
          <span className="truncate font-medium">{text}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
        <DropdownMenuCheckboxItem
          checked={selected.length === 0}
          onSelect={(e) => e.preventDefault()}
          onCheckedChange={() => onChange([])}
        >
          Todas
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {options.length === 0 ? (
          <DropdownMenuItem disabled>Nenhuma campanha</DropdownMenuItem>
        ) : (
          options.map((o) => (
            <DropdownMenuCheckboxItem
              key={o}
              checked={selected.includes(o)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={() => toggle(o)}
            >
              <span className="truncate">{o}</span>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FilterBar({
  filters,
  campaigns,
  syncing,
  onChange,
  onPreset,
  onSync,
}: {
  filters: Filters;
  campaigns: string[];
  syncing: string | null;
  onChange: (patch: Partial<Filters>) => void;
  onPreset: (days: number) => void;
  onSync: (source: "all" | "meta" | "ghl" | "sheets") => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/40 px-4 py-3">
      <MultiSelect
        label="Campanha"
        selected={filters.campaigns}
        options={campaigns}
        onChange={(campaigns) => onChange({ campaigns })}
      />

      <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
        {PRESETS.map((d) => (
          <button
            key={d}
            onClick={() => onPreset(d)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              filters.preset === d
                ? "bg-brand-gradient text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {d}d
          </button>
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarDays className="size-3.5" />
            {filters.preset === null
              ? `${dateLabel(filters.from)} – ${dateLabel(filters.to)}`
              : "Período"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            numberOfMonths={2}
            defaultMonth={new Date(`${filters.from}T12:00:00`)}
            selected={{
              from: new Date(`${filters.from}T12:00:00`),
              to: new Date(`${filters.to}T12:00:00`),
            }}
            onSelect={(range) => {
              if (range?.from && range?.to) {
                onChange({
                  from: range.from.toISOString().slice(0, 10),
                  to: range.to.toISOString().slice(0, 10),
                  preset: null,
                });
              }
            }}
          />
        </PopoverContent>
      </Popover>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => onSync("all")}
          disabled={syncing !== null}
          className={cn("bg-brand-gradient gap-2 text-primary-foreground", syncing && "animate-pulse")}
        >
          {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          {syncing ? "Sincronizando..." : "Sincronizar"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" disabled={syncing !== null}>
              Sync Específico
              <ChevronDown className="size-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Re-sincronizar fonte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onSync("meta")}>Meta Ads</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSync("ghl")}>GoHighLevel</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSync("sheets")}>Google Sheets</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/configuracoes">
            <Settings className="size-3.5" />
            Configurações
          </Link>
        </Button>
      </div>
    </div>
  );
}
