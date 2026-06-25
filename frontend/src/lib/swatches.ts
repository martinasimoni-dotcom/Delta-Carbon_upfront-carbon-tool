// CSS background patterns for material swatches (no external assets).
// Each entry returns a style object with background layers approximating the texture.

import type { Material } from "./materials";

type Swatch = { background: string; backgroundSize?: string; backgroundColor?: string };

const PATTERNS: Record<string, Swatch> = {
  // WOOD — grain stripes
  timber: {
    backgroundColor: "#d6a974",
    background:
      "repeating-linear-gradient(90deg, rgba(120,70,30,0.35) 0 1px, transparent 1px 7px)," +
      "repeating-linear-gradient(90deg, rgba(80,40,10,0.18) 0 2px, transparent 2px 22px)",
  },
  clt: {
    backgroundColor: "#c89868",
    background:
      "repeating-linear-gradient(0deg, rgba(70,40,15,0.5) 0 2px, transparent 2px 18px)," +
      "repeating-linear-gradient(90deg, rgba(70,40,15,0.25) 0 1px, transparent 1px 9px)",
  },
  osb: {
    backgroundColor: "#b88a52",
    background:
      "repeating-linear-gradient(35deg, rgba(80,45,15,0.45) 0 6px, transparent 6px 14px)," +
      "repeating-linear-gradient(-45deg, rgba(60,30,10,0.35) 0 4px, transparent 4px 11px)",
  },
  "wood-fiber-ins": {
    backgroundColor: "#a87a48",
    background:
      "repeating-linear-gradient(15deg, rgba(60,30,10,0.35) 0 1px, transparent 1px 4px)",
  },
  "hemp-lime": {
    backgroundColor: "#d8c89a",
    background:
      "repeating-linear-gradient(45deg, rgba(110,90,50,0.35) 0 1px, transparent 1px 5px)," +
      "repeating-linear-gradient(-45deg, rgba(110,90,50,0.25) 0 1px, transparent 1px 6px)",
  },
  straw: {
    backgroundColor: "#e0c878",
    background:
      "repeating-linear-gradient(80deg, rgba(120,90,30,0.45) 0 1px, transparent 1px 4px)",
  },

  // MINERAL
  "concrete-c20": {
    backgroundColor: "#b6b6b3",
    background:
      "radial-gradient(circle at 20% 30%, rgba(0,0,0,0.12) 0 1px, transparent 2px)," +
      "radial-gradient(circle at 70% 60%, rgba(0,0,0,0.10) 0 1px, transparent 2px)," +
      "radial-gradient(circle at 40% 80%, rgba(0,0,0,0.08) 0 1px, transparent 2px)",
    backgroundSize: "14px 14px, 22px 22px, 30px 30px",
  },
  "concrete-c30": {
    backgroundColor: "#9d9d99",
    background:
      "radial-gradient(circle at 30% 40%, rgba(0,0,0,0.18) 0 1px, transparent 2px)," +
      "radial-gradient(circle at 70% 70%, rgba(0,0,0,0.12) 0 1px, transparent 2px)",
    backgroundSize: "12px 12px, 20px 20px",
  },
  "brick-red": {
    backgroundColor: "#9c4634",
    background:
      "linear-gradient(transparent 47%, rgba(0,0,0,0.45) 47% 50%, transparent 50%)," +
      "linear-gradient(90deg, transparent 47%, rgba(0,0,0,0.45) 47% 50%, transparent 50%)",
    backgroundSize: "32px 16px, 32px 16px",
  },
  "aerated-block": {
    backgroundColor: "#e6e2d8",
    background:
      "radial-gradient(circle at 25% 25%, rgba(0,0,0,0.18) 0 2px, transparent 3px)," +
      "radial-gradient(circle at 75% 75%, rgba(0,0,0,0.14) 0 2px, transparent 3px)",
    backgroundSize: "10px 10px, 14px 14px",
  },
  "brick-reused": {
    backgroundColor: "#a86250",
    background:
      "linear-gradient(transparent 47%, rgba(0,0,0,0.5) 47% 50%, transparent 50%)," +
      "linear-gradient(90deg, transparent 47%, rgba(0,0,0,0.5) 47% 50%, transparent 50%)," +
      "radial-gradient(circle at 30% 60%, rgba(60,30,15,0.35) 0 2px, transparent 3px)",
    backgroundSize: "30px 14px, 30px 14px, 18px 18px",
  },
  "clay-brick-unfired": {
    backgroundColor: "#c98058",
    background:
      "linear-gradient(transparent 47%, rgba(0,0,0,0.35) 47% 50%, transparent 50%)," +
      "linear-gradient(90deg, transparent 47%, rgba(0,0,0,0.35) 47% 50%, transparent 50%)",
    backgroundSize: "30px 15px, 30px 15px",
  },

  // METAL
  "steel-struct": {
    backgroundColor: "#5b6066",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.18), transparent 40%)," +
      "repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 3px)",
  },
  "steel-galv": {
    backgroundColor: "#b8bcc2",
    background:
      "radial-gradient(ellipse 8px 5px at 30% 30%, rgba(0,0,0,0.25), transparent 70%)," +
      "radial-gradient(ellipse 10px 6px at 70% 60%, rgba(0,0,0,0.18), transparent 70%)," +
      "radial-gradient(ellipse 6px 4px at 50% 80%, rgba(0,0,0,0.20), transparent 70%)",
    backgroundSize: "30px 30px, 40px 40px, 25px 25px",
  },
  aluminium: {
    backgroundColor: "#d0d4d8",
    background:
      "repeating-linear-gradient(90deg, rgba(0,0,0,0.10) 0 1px, transparent 1px 2px)",
  },
  zinc: {
    backgroundColor: "#8a909a",
    background:
      "radial-gradient(ellipse 12px 6px at 30% 40%, rgba(255,255,255,0.18), transparent 70%)," +
      "radial-gradient(ellipse 10px 5px at 70% 70%, rgba(0,0,0,0.20), transparent 70%)",
    backgroundSize: "40px 30px, 35px 28px",
  },

  // INSULATION
  "stone-wool": {
    backgroundColor: "#d8b46a",
    background:
      "repeating-linear-gradient(40deg, rgba(120,80,20,0.35) 0 1px, transparent 1px 3px)," +
      "repeating-linear-gradient(-40deg, rgba(120,80,20,0.25) 0 1px, transparent 1px 3px)",
  },
  "glass-wool": {
    backgroundColor: "#f4e9b8",
    background:
      "repeating-linear-gradient(60deg, rgba(180,140,40,0.30) 0 1px, transparent 1px 3px)",
  },
  "wood-fiber-ins-2": {
    backgroundColor: "#9d6e3e",
    background:
      "repeating-linear-gradient(20deg, rgba(50,25,5,0.40) 0 1px, transparent 1px 4px)",
  },
  cork: {
    backgroundColor: "#c98a55",
    background:
      "radial-gradient(circle at 25% 25%, rgba(80,40,10,0.55) 0 2px, transparent 3px)," +
      "radial-gradient(circle at 70% 60%, rgba(80,40,10,0.45) 0 2px, transparent 3px)," +
      "radial-gradient(circle at 50% 80%, rgba(80,40,10,0.40) 0 2px, transparent 3px)",
    backgroundSize: "12px 12px, 18px 18px, 22px 22px",
  },
  eps: {
    backgroundColor: "#f5f5f3",
    background:
      "radial-gradient(circle at 25% 25%, rgba(0,0,0,0.10) 0 1px, transparent 2px)," +
      "radial-gradient(circle at 75% 75%, rgba(0,0,0,0.08) 0 1px, transparent 2px)",
    backgroundSize: "8px 8px, 11px 11px",
  },
};

const FALLBACK_BY_CAT: Record<string, Swatch> = {
  wood: { backgroundColor: "#b88a52", background: "" },
  mineral: { backgroundColor: "#a8a8a4", background: "" },
  metal: { backgroundColor: "#7a7f86", background: "" },
  insulation: { backgroundColor: "#e6d59a", background: "" },
};

export const swatchStyle = (m: Material): React.CSSProperties => {
  const s = PATTERNS[m.id] ?? FALLBACK_BY_CAT[m.category];
  return {
    backgroundColor: s.backgroundColor,
    backgroundImage: s.background,
    backgroundSize: s.backgroundSize,
  };
};

// Approximate display color for the 3D viewport (hex).
export const materialHex = (m: Material): string => {
  const s = PATTERNS[m.id] ?? FALLBACK_BY_CAT[m.category];
  return s.backgroundColor ?? "#888888";
};
