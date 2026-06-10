import { Button } from "@/components/ui/button";
import { useBuilding } from "@/state/building";
import { totalCO2kg } from "@/lib/carbon";
import { downloadPassport } from "@/lib/passport";

export function Footer() {
  const elements = useBuilding((s) => s.elements);
  const dims = useBuilding((s) => s.dims);
  const reset = useBuilding((s) => s.reset);

  const totalT = totalCO2kg(elements) / 1000;
  const totalArea = dims.width * dims.depth * Math.max(1, Math.round(dims.height / 3));
  const matCount = new Set(elements.map((e) => e.materialId)).size;

  return (
    <footer className="h-[70px] border-t border-border bg-background flex items-center justify-between px-6">
      <div className="flex gap-8 text-xs">
        <Stat label="Total area" value={`${totalArea.toLocaleString()} m²`} />
        <Stat label="Total CO₂" value={`${totalT.toFixed(1)} t`} />
        <Stat label="Materials" value={String(matCount)} />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={reset} className="rounded-sm">
          Reset
        </Button>
        <Button size="sm" onClick={downloadPassport} className="rounded-sm">
          Download Passport
        </Button>
      </div>
    </footer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] tracking-wider uppercase text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
