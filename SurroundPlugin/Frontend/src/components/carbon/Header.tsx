export function Header() {
  return (
    <header className="h-[60px] border-b border-border bg-background flex items-center justify-between px-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-sm font-semibold tracking-[0.15em] uppercase text-foreground">
          SURROUND
        </h1>
      </div>
      <span className="text-[11px] tracking-wider uppercase border border-border px-2 py-1 text-muted-foreground">
        41.4036° N, 2.1900° E
      </span>
    </header>
  );
}
