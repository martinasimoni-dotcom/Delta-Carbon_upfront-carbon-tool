import { useBuilding } from "@/state/building";
import { suggestSwaps } from "@/lib/carbon";

export function OptimizeSection() {
  const elements = useBuilding((s) => s.elements);
  const setMaterial = useBuilding((s) => s.setMaterial);
  const suggestions = suggestSwaps(elements);

  if (suggestions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No further reductions found within current categories.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {suggestions.map((s) => (
        <button
          key={s.elementId + s.toMaterial.id}
          onClick={() => setMaterial(s.elementId, s.toMaterial.id)}
          className="w-full text-left border border-border rounded-sm p-3 hover:border-primary transition-colors"
        >
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {s.elementLabel}
          </div>
          <div className="text-xs text-foreground mt-1">
            Switch <span className="font-medium">{s.fromMaterial.name}</span> →{" "}
            <span className="font-medium">{s.toMaterial.name}</span>
          </div>
          <div className="text-xs text-primary font-medium tabular-nums mt-1">
            −{(s.savingsKg / 1000).toFixed(1)} t CO₂
          </div>
        </button>
      ))}
    </div>
  );
}
