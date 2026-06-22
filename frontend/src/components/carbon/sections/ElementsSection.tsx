import { useState } from "react";
import { useBuilding } from "@/state/building";
import { Input } from "@/components/ui/input";
import { getMaterial } from "@/lib/materials";
import { swatchStyle } from "@/lib/swatches";
import { MaterialLibrary } from "../MaterialLibrary";
import { ChevronRight } from "lucide-react";

export function ElementsSection() {
  const elements = useBuilding((s) => s.elements);
  const setVolume = useBuilding((s) => s.setVolume);
  const updateCurrentProject = useBuilding((s) => s.updateCurrentProject);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-1.5">
        {elements.map((e) => {
          const m = getMaterial(e.materialId);
          const tons = (m.co2PerM3 * e.volumeM3) / 1000;
          return (
            <div
              key={e.id}
              className="group border border-border rounded-sm overflow-hidden hover:border-foreground/30 transition-colors"
            >
              <button
                onClick={() => setOpenId(e.id)}
                className="w-full flex items-center gap-3 px-2.5 py-2 text-left hover:bg-muted/40 transition-colors"
              >
                <div
                  className="size-10 rounded-sm border border-border shrink-0"
                  style={swatchStyle(m)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{e.label}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{m.name}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-[11px] tabular-nums text-foreground">
                    {tons >= 0 ? "+" : ""}
                    {tons.toFixed(1)}t
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    CO₂
                  </div>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-t border-border bg-muted/20">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Volume
                </span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={Math.round(e.volumeM3)}
                    onChange={(ev) => { setVolume(e.id, Number(ev.target.value) || 0); updateCurrentProject(); }}
                    className="h-6 w-20 text-right text-[11px] rounded-sm font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">m³</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Click an element to open the material library.
      </p>
      <MaterialLibrary
        elementId={openId}
        open={openId !== null}
        onOpenChange={(v) => !v && setOpenId(null)}
      />
    </>
  );
}
