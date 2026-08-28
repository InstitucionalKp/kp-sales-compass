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
  campaign: string;
  from: string;
  to: string;
  preset: number | null;
};

const PRESETS = [7, 15, 30, 60];

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[280px] gap-2">
          <span className="text-muted-foreground">{label}:</span>
          <span className="truncate font-medium">{value === "todas" ? "Todas" : value}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        <DropdownMenuItem onSelect={() => onChange("todas")}>Todas</DropdownMenuItem>
        <DropdownMenuSeparator />
        {options.map((o) => (
          <DropdownMenuItem key={o} onSelect={() => onChange(o)}>
            {o}
          </DropdownMenuItem>
        ))}
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
      <Select
        label="Campanha"
        value={filters.campaign}
        options={campaigns}
        onChange={(campaign) => onChange({ campaign })}
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
