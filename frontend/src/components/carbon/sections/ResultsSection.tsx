import { useBuilding } from "@/state/building";
import { elementCO2kg, totalCO2kg } from "@/lib/carbon";

export function ResultsSection() {
  const elements = useBuilding((s) => s.elements);
  const transportCo2Kg = useBuilding((s) => s.transportCo2Kg);
  const a1a3T = totalCO2kg(elements) / 1000;
  const transportT = transportCo2Kg / 1000;
  const totalT = a1a3T + transportT;
  const data = elements.map((e) => ({ label: e.label, t: elementCO2kg(e) / 1000 }));
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.t)), 1);

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-sm p-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Total embodied carbon (A1–A4)
        </div>
        <div className="text-3xl font-semibold tabular-nums text-foreground mt-1">
          {totalT.toFixed(1)}{" "}
          <span className="text-sm font-normal text-muted-foreground">t CO₂e</span>
        </div>
        <div className="mt-2 space-y-0.5 text-[10px] text-muted-foreground tabular-nums">
          <div className="flex justify-between">
            <span>A1–A3 materials</span>
            <span>{a1a3T.toFixed(1)} t</span>
          </div>
          {transportCo2Kg > 0 && (
            <div className="flex justify-between">
              <span>A4 transport</span>
              <span>{transportT.toFixed(1)} t</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {data.map((d) => {
          const pct = (Math.abs(d.t) / maxAbs) * 100;
          const negative = d.t < 0;
          return (
            <div key={d.label}>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-foreground">{d.label}</span>
                <span className="tabular-nums text-muted-foreground">{d.t.toFixed(1)} t</span>
              </div>
              <div className="h-2 bg-muted rounded-sm overflow-hidden">
                <div
                  className={negative ? "h-full bg-emerald-700" : "h-full bg-primary"}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
