import { Link } from "@tanstack/react-router";
import { DEFAULT_SEARCH } from "@/lib/dashboard-search";

export function AppHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4">
        <Link to="/" search={DEFAULT_SEARCH} className="flex items-center gap-3">
          <span className="bg-brand-gradient flex size-9 items-center justify-center rounded-lg text-sm font-bold text-primary-foreground">
            KP
          </span>
          <span className="text-sm font-semibold tracking-tight sm:text-base">
            KP Assessoria <span className="text-muted-foreground">— Dashboard Comercial</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
