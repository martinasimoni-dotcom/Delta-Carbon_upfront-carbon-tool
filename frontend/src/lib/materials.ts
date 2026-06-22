// Carbon coefficients source: BEDEC/ITeC (Institut de Tecnologia de la Construcció de Catalunya)
// Values: kg CO₂e/m³ at A1–A3. Retrieved via 2050-materials API, country="ES".
// Last aligned: June 2026

export type Category = "wood" | "mineral" | "metal" | "insulation";

export type Material = {
  id: string;
  name: string;
  category: Category;
  co2PerM3: number; // kg CO2 eq / m3
  density: number;  // kg/m³ — used for A4 transport weight calculation
  source: string;
};

export const CATEGORY_LABELS: Record<Category, string> = {
  wood: "Træ/Biobaseret (Wood/Biobased)",
  mineral: "Mineralsk (Mineral)",
  metal: "Metal",
  insulation: "Insulation",
};

export const MATERIALS: Material[] = [
  // WOOD / BIOBASED
  { id: "timber",        name: "Construction timber",    category: "wood",       co2PerM3:  -420, density:  600, source: "BEDEC/ITeC" },
  { id: "clt",           name: "CLT / Glulam",           category: "wood",       co2PerM3:  -400, density:  500, source: "BEDEC/ITeC" },
  { id: "osb",           name: "OSB",                    category: "wood",       co2PerM3:  -390, density:  600, source: "BEDEC/ITeC" },
  { id: "wood-fiber-ins",name: "Wood fiber insulation",  category: "wood",       co2PerM3:  -127, density:   50, source: "TODO: verify against BEDEC/ITeC" },
  { id: "hemp-lime",     name: "Hemp lime",               category: "wood",       co2PerM3:   -76, density:  350, source: "TODO: verify against BEDEC/ITeC" },
  { id: "straw",         name: "Straw",                  category: "wood",       co2PerM3:  -120, density:  120, source: "BEDEC/ITeC" },

  // MINERAL
  { id: "concrete-c20",  name: "Concrete C20/25",        category: "mineral",    co2PerM3:   258, density: 2400, source: "BEDEC/ITeC" },
  { id: "concrete-c30",  name: "Concrete C30/37",        category: "mineral",    co2PerM3:   312, density: 2400, source: "BEDEC/ITeC" },
  { id: "brick-red",     name: "Brick, red",             category: "mineral",    co2PerM3:   432, density: 1800, source: "BEDEC/ITeC" },
  { id: "aerated-block", name: "Aerated concrete blocks",category: "mineral",    co2PerM3:   216, density:  600, source: "BEDEC/ITeC" },
  { id: "brick-reused",  name: "Reused brick",           category: "mineral",    co2PerM3:    10, density: 1800, source: "BEDEC/ITeC" },
  { id: "clay-brick-unfired", name: "Unfired clay brick",category: "mineral",    co2PerM3:   9.6, density: 1800, source: "TODO: verify against BEDEC/ITeC" },

  // METAL
  { id: "steel-struct",  name: "Structural steel",       category: "metal",      co2PerM3: 11461, density: 7850, source: "BEDEC/ITeC" },
  { id: "steel-galv",    name: "Galvanised steel",       category: "metal",      co2PerM3: 15308, density: 7850, source: "BEDEC/ITeC" },
  { id: "aluminium",     name: "Aluminium sheet",        category: "metal",      co2PerM3: 46605, density: 2700, source: "BEDEC/ITeC" },
  { id: "zinc",          name: "Zinc",                   category: "metal",      co2PerM3: 22248, density: 7100, source: "TODO: verify against BEDEC/ITeC" },

  // INSULATION
  { id: "stone-wool",    name: "Stone wool",             category: "insulation", co2PerM3:    93, density:  100, source: "BEDEC/ITeC" },
  { id: "glass-wool",    name: "Glass wool",             category: "insulation", co2PerM3: 239.2, density:   15, source: "TODO: verify against BEDEC/ITeC" },
  { id: "wood-fiber-ins-2", name: "Wood fiber insulation", category: "insulation", co2PerM3: -61.1, density:  50, source: "TODO: verify against BEDEC/ITeC" },
  { id: "cork",          name: "Expanded cork",          category: "insulation", co2PerM3:  -100, density:  120, source: "BEDEC/ITeC" },
  { id: "eps",           name: "EPS",                    category: "insulation", co2PerM3:  46.8, density:   30, source: "TODO: verify against BEDEC/ITeC" },
];

export const getMaterial = (id: string): Material =>
  MATERIALS.find((m) => m.id === id) ?? MATERIALS[0];

export const materialsByCategory = (): Record<Category, Material[]> => {
  const out: Record<Category, Material[]> = { wood: [], mineral: [], metal: [], insulation: [] };
  for (const m of MATERIALS) out[m.category].push(m);
  return out;
};
