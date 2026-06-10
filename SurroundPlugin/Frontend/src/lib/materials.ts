export type Category = "wood" | "mineral" | "metal" | "insulation";

export type Material = {
  id: string;
  name: string;
  category: Category;
  co2PerM3: number; // kg CO2 eq / m3
};

export const CATEGORY_LABELS: Record<Category, string> = {
  wood: "Træ/Biobaseret (Wood/Biobased)",
  mineral: "Mineralsk (Mineral)",
  metal: "Metal",
  insulation: "Insulation",
};

export const MATERIALS: Material[] = [
  // WOOD / BIOBASED
  { id: "timber", name: "Construction timber", category: "wood", co2PerM3: -680 },
  { id: "clt", name: "CLT / Glulam", category: "wood", co2PerM3: -664 },
  { id: "osb", name: "OSB", category: "wood", co2PerM3: -639 },
  { id: "wood-fiber-ins", name: "Wood fiber insulation", category: "wood", co2PerM3: -127 },
  { id: "hemp-lime", name: "Hemp lime", category: "wood", co2PerM3: -76 },
  { id: "straw", name: "Straw", category: "wood", co2PerM3: -127 },

  // MINERAL
  { id: "concrete-c20", name: "Concrete C20/25", category: "mineral", co2PerM3: 215 },
  { id: "concrete-c30", name: "Concrete C30/37", category: "mineral", co2PerM3: 282 },
  { id: "brick-red", name: "Brick, red", category: "mineral", co2PerM3: 297 },
  { id: "aerated-block", name: "Aerated concrete blocks", category: "mineral", co2PerM3: 91.8 },
  { id: "brick-reused", name: "Reused brick", category: "mineral", co2PerM3: 5.6 },
  { id: "clay-brick-unfired", name: "Unfired clay brick", category: "mineral", co2PerM3: 9.6 },

  // METAL
  { id: "steel-struct", name: "Structural steel", category: "metal", co2PerM3: 5403 },
  { id: "steel-galv", name: "Galvanised steel", category: "metal", co2PerM3: 23482 },
  { id: "aluminium", name: "Aluminium sheet", category: "metal", co2PerM3: 28890 },
  { id: "zinc", name: "Zinc", category: "metal", co2PerM3: 22248 },

  // INSULATION
  { id: "stone-wool", name: "Stone wool", category: "insulation", co2PerM3: 93.3 },
  { id: "glass-wool", name: "Glass wool", category: "insulation", co2PerM3: 239.2 },
  { id: "wood-fiber-ins-2", name: "Wood fiber insulation", category: "insulation", co2PerM3: -61.1 },
  { id: "cork", name: "Expanded cork", category: "insulation", co2PerM3: -86.4 },
  { id: "eps", name: "EPS", category: "insulation", co2PerM3: 46.8 },
];

export const getMaterial = (id: string): Material =>
  MATERIALS.find((m) => m.id === id) ?? MATERIALS[0];

export const materialsByCategory = (): Record<Category, Material[]> => {
  const out: Record<Category, Material[]> = { wood: [], mineral: [], metal: [], insulation: [] };
  for (const m of MATERIALS) out[m.category].push(m);
  return out;
};
