import { MATERIALS, getMaterial, type Material } from "./materials";
import type { BuildingElement } from "@/state/building";

export const elementCO2kg = (el: BuildingElement): number =>
  el.volumeM3 * getMaterial(el.materialId).co2PerM3;

export const totalCO2kg = (els: BuildingElement[]): number =>
  els.reduce((s, e) => s + elementCO2kg(e), 0);

export type Suggestion = {
  elementId: string;
  elementLabel: string;
  fromMaterial: Material;
  toMaterial: Material;
  savingsKg: number;
};

export const suggestSwaps = (els: BuildingElement[]): Suggestion[] => {
  const out: Suggestion[] = [];
  for (const el of els) {
    const cur = getMaterial(el.materialId);
    const sameCat = MATERIALS.filter((m) => m.category === cur.category);
    const best = sameCat.reduce((a, b) => (b.co2PerM3 < a.co2PerM3 ? b : a), cur);
    if (best.id === cur.id) continue;
    const savings = (cur.co2PerM3 - best.co2PerM3) * el.volumeM3;
    if (savings <= 0) continue;
    out.push({
      elementId: el.id,
      elementLabel: el.label,
      fromMaterial: cur,
      toMaterial: best,
      savingsKg: savings,
    });
  }
  return out.sort((a, b) => b.savingsKg - a.savingsKg).slice(0, 3);
};
