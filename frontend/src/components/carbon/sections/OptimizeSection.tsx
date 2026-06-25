import { useState } from "react";
import { useBuilding } from "@/state/building";
import { suggestSwaps } from "@/lib/carbon";
import { getMaterial, MATERIALS } from "@/lib/materials";

type LiveSuggestion = {
  material_name: string;
  co2_per_m3: number;
  co2_kg_total: number;
  delta_kg: number;
  delta_tonnes: number;
  suitability_note: string;
  epd_source: string;
};

type ElementSuggestions = {
  elementId: string;
  loading: boolean;
  error: string | null;
  suggestions: LiveSuggestion[] | null;
  usedFallback: boolean;
};

export function OptimizeSection() {
  const elements = useBuilding((s) => s.elements);
  const setMaterial = useBuilding((s) => s.setMaterial);
  const updateCurrentProject = useBuilding((s) => s.updateCurrentProject);
  const [state, setState] = useState<Record<string, ElementSuggestions>>({});

  const fetchSuggestions = async (elementId: string) => {
    const el = elements.find((e) => e.id === elementId);
    if (!el) return;

    const mat = getMaterial(el.materialId);
    const currentCo2Kg = el.volumeM3 * mat.co2PerM3;

    setState((s) => ({
      ...s,
      [elementId]: { elementId, loading: true, error: null, suggestions: null, usedFallback: false },
    }));

    try {
      const res = await fetch("/v1/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          element_type: el.kind,
          current_material: mat.name,
          current_co2_kg: currentCo2Kg,
          volume_m3: el.volumeM3,
          building_use: "residential",
          country: "ES",
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.error === "backend_unavailable" || !data.suggestions?.length) {
        throw new Error("backend_unavailable");
      }

      setState((s) => ({
        ...s,
        [elementId]: { elementId, loading: false, error: null, suggestions: data.suggestions, usedFallback: false },
      }));
    } catch {
      // Fall back to local suggestSwaps
      const localSuggestions = suggestSwaps(elements).filter((s) => s.elementId === elementId);
      const fallback: LiveSuggestion[] = localSuggestions.map((s) => ({
        material_name: s.toMaterial.name,
        co2_per_m3: s.toMaterial.co2PerM3,
        co2_kg_total: s.toMaterial.co2PerM3 * el.volumeM3,
        delta_kg: -s.savingsKg,
        delta_tonnes: -s.savingsKg / 1000,
        suitability_note: "Reference value — same structural category.",
        epd_source: "BEDEC/ITeC (local reference)",
      }));

      setState((s) => ({
        ...s,
        [elementId]: { elementId, loading: false, error: null, suggestions: fallback, usedFallback: true },
      }));
    }
  };

  const applyLiveSuggestion = (elementId: string, suggestion: LiveSuggestion) => {
    const match = MATERIALS.reduce((best, m) =>
      Math.abs(m.co2PerM3 - suggestion.co2_per_m3) < Math.abs(best.co2PerM3 - suggestion.co2_per_m3) ? m : best
    );
    setMaterial(elementId, match.id);
    updateCurrentProject();
  };

  return (
    <div className="space-y-3">
      {elements.map((el) => {
        const es = state[el.id];
        const mat = getMaterial(el.materialId);

        return (
          <div key={el.id} className="border border-border rounded-sm p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{el.label}</div>
                <div className="text-xs text-foreground">{mat.name}</div>
              </div>
              <button
                onClick={() => fetchSuggestions(el.id)}
                disabled={es?.loading}
                className="text-[10px] uppercase tracking-wider border border-border rounded-sm px-2 py-1 hover:border-primary disabled:opacity-50 transition-colors"
              >
                {es?.loading ? "Retrieving…" : "Get suggestions"}
              </button>
            </div>

            {es?.usedFallback && (
              <p className="text-[10px] text-yellow-600">
                Live EPD unavailable — showing reference suggestions
              </p>
            )}

            {es?.loading && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                Querying BEDEC/ITeC database and Claude…
              </div>
            )}

            {es?.suggestions && es.suggestions.length > 0 && (
              <div className="space-y-2 pt-1">
                {es.suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="border border-border rounded-sm p-2 space-y-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">{s.material_name}</div>
                        <div className="text-[10px] text-muted-foreground">{s.suitability_note}</div>
                      </div>
                      <div className="text-xs font-medium tabular-nums shrink-0" style={{ color: s.delta_tonnes <= 0 ? "#1A9E75" : "#E05540" }}>
                        {s.delta_tonnes <= 0 ? "−" : "+"}{Math.abs(s.delta_tonnes).toFixed(1)} t CO₂
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-muted-foreground">{s.epd_source}</span>
                      <button
                        onClick={() => applyLiveSuggestion(el.id, s)}
                        className="text-[9px] uppercase tracking-wider border border-border rounded-sm px-2 py-0.5 hover:border-primary transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {es?.suggestions?.length === 0 && (
              <p className="text-[10px] text-muted-foreground">No alternatives found for this element.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
