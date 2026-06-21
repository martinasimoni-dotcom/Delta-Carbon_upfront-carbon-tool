import { useBuilding } from "@/state/building";

export function Header() {
  const plotCenter = useBuilding((s) => s.plotCenter);
  const coordStr = plotCenter
    ? `${Math.abs(plotCenter.lat).toFixed(4)}° ${plotCenter.lat >= 0 ? "N" : "S"}, ${Math.abs(plotCenter.lon).toFixed(4)}° ${plotCenter.lon >= 0 ? "E" : "W"}`
    : null;

  return (
    <header className="h-[60px] border-b border-border bg-background flex items-center justify-between px-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-sm font-semibold tracking-[0.15em] uppercase text-foreground">
          Early Carbon
        </h1>
      </div>
      {coordStr && (
        <span className="text-[11px] tracking-wider uppercase border border-border px-2 py-1 text-muted-foreground">
          {coordStr}
        </span>
      )}
    </header>
  );
}
