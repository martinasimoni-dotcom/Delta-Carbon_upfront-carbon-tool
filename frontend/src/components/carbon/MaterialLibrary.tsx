import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Star, Search } from "lucide-react";
import { MATERIALS, CATEGORY_LABELS, getMaterial, type Category, type Material } from "@/lib/materials";
import { swatchStyle } from "@/lib/swatches";
import { useBuilding } from "@/state/building";
import { cn } from "@/lib/utils";

const CAT_ICON: Record<Category, string> = {
  wood: "🌲",
  mineral: "🏛️",
  metal: "⚙️",
  insulation: "❄️",
};

const CAT_PILL: Record<Category, string> = {
  wood: "bg-[oklch(0.95_0.04_150)] text-[oklch(0.35_0.08_150)]",
  mineral: "bg-[oklch(0.94_0_0)] text-[oklch(0.35_0_0)]",
  metal: "bg-[oklch(0.93_0.005_240)] text-[oklch(0.35_0.01_240)]",
  insulation: "bg-[oklch(0.94_0.04_230)] text-[oklch(0.35_0.08_230)]",
};

const FAV_KEY = "carbon.favs";
const loadFavs = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]"));
  } catch {
    return new Set();
  }
};

export function MaterialLibrary({
  elementId,
  open,
  onOpenChange,
}: {
  elementId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const elements = useBuilding((s) => s.elements);
  const setMaterial = useBuilding((s) => s.setMaterial);
  const element = elements.find((e) => e.id === elementId) ?? null;

  const [tab, setTab] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const [favs, setFavs] = useState<Set<string>>(() => loadFavs());

  const toggleFav = (id: string) => {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (typeof window !== "undefined") {
        localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list: Material[] = MATERIALS.slice();
    if (tab === "favorites") list = list.filter((m) => favs.has(m.id));
    else if (tab !== "all") list = list.filter((m) => m.category === tab);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }
    if (lowOnly) list = list.filter((m) => m.co2PerM3 < 100);
    list.sort((a, b) => (sortAsc ? a.co2PerM3 - b.co2PerM3 : b.co2PerM3 - a.co2PerM3));
    return list;
  }, [tab, query, lowOnly, sortAsc, favs]);

  const selectedId = element?.materialId;
  const selected = selectedId ? getMaterial(selectedId) : null;
  const elCO2t = element && selected ? (selected.co2PerM3 * element.volumeM3) / 1000 : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[640px] p-0 flex flex-col gap-0"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border space-y-1">
          <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            Material Library — applying to
          </div>
          <SheetTitle className="text-sm font-semibold uppercase tracking-[0.05em]">
            {element?.label ?? "—"}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground tabular-nums">
            {element ? `${Math.round(element.volumeM3)} m³` : ""}
            {selected ? ` · current: ${selected.name} · ${elCO2t.toFixed(2)} t CO₂` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 py-3 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search materials…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 pl-7 text-xs rounded-sm"
            />
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={lowOnly}
                onChange={(e) => setLowOnly(e.target.checked)}
                className="accent-primary"
              />
              Low-carbon only (&lt;100)
            </label>
            <button
              onClick={() => setSortAsc((v) => !v)}
              className="hover:text-foreground transition-colors"
            >
              Sort CO₂ {sortAsc ? "↑" : "↓"}
            </button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-5 mt-3 h-8 bg-muted/40 rounded-sm p-0.5 grid grid-cols-6 gap-0.5">
            <TabsTrigger value="all" className="text-[10px] uppercase tracking-wider rounded-sm">All</TabsTrigger>
            <TabsTrigger value="wood" className="text-[10px] uppercase tracking-wider rounded-sm">🌲 Wood</TabsTrigger>
            <TabsTrigger value="mineral" className="text-[10px] uppercase tracking-wider rounded-sm">🏛️ Mineral</TabsTrigger>
            <TabsTrigger value="metal" className="text-[10px] uppercase tracking-wider rounded-sm">⚙️ Metal</TabsTrigger>
            <TabsTrigger value="insulation" className="text-[10px] uppercase tracking-wider rounded-sm">❄️ Insul.</TabsTrigger>
            <TabsTrigger value="favorites" className="text-[10px] uppercase tracking-wider rounded-sm">★ Favs</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="flex-1 overflow-y-auto px-5 py-4 mt-0">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground py-12 text-center">
                No materials match these filters.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {filtered.map((m) => {
                  const isSel = m.id === selectedId;
                  const isFav = favs.has(m.id);
                  const tons = element ? (m.co2PerM3 * element.volumeM3) / 1000 : 0;
                  return (
                    <button
                      key={m.id}
                      onClick={() => element && setMaterial(element.id, m.id)}
                      className={cn(
                        "group text-left bg-[oklch(0.985_0_0)] rounded-sm overflow-hidden transition-all duration-200",
                        "border hover:shadow-md hover:-translate-y-0.5",
                        isSel
                          ? "border-[3px] border-primary shadow-sm"
                          : "border border-border hover:border-foreground/40",
                      )}
                    >
                      <div className="relative aspect-[4/3]">
                        <div className="absolute inset-0" style={swatchStyle(m)} />
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFav(m.id);
                          }}
                          className={cn(
                            "absolute top-1.5 right-1.5 size-6 rounded-full bg-background/90 grid place-items-center transition-colors",
                            isFav ? "text-primary" : "text-muted-foreground hover:text-foreground",
                          )}
                          role="button"
                          aria-label="favorite"
                        >
                          <Star className="size-3" fill={isFav ? "currentColor" : "none"} />
                        </span>
                        {m.co2PerM3 < 0 && (
                          <Badge className="absolute bottom-1.5 left-1.5 h-4 px-1.5 rounded-sm text-[9px] bg-primary/90 hover:bg-primary/90">
                            CARBON SINK
                          </Badge>
                        )}
                      </div>
                      <div className="p-2.5 space-y-1.5">
                        <div className="text-[13px] font-medium text-foreground leading-tight line-clamp-2 min-h-[32px]">
                          {m.name}
                        </div>
                        <div className="font-mono text-[11px] text-foreground tabular-nums">
                          {m.co2PerM3 > 0 ? "+" : ""}
                          {m.co2PerM3} <span className="text-muted-foreground">kg CO₂/m³</span>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={cn(
                              "inline-block px-1.5 py-0.5 rounded-sm text-[9px] uppercase tracking-wider font-medium",
                              CAT_PILL[m.category],
                            )}
                          >
                            {CAT_ICON[m.category]} {m.category}
                          </span>
                          {element && (
                            <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                              {tons.toFixed(1)}t
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="sr-only">{CATEGORY_LABELS.wood}</p>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
