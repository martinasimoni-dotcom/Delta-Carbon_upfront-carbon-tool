// SVG axonometric of a 7-floor office building with material zones.
// Pure SVG, flat style, no shadows.

const CONCRETE = "#8C8A84";
const CLT = "#C8885E";
const BRICK = "#C47A5A";
const GLAZE = "#B8D8E8";
const STROKE = "#2b2b2b";

// Axonometric projection: x' = x - y*cos30, y' = z - y*sin30 (-> we'll just hand-place)
// Building footprint 200 (W) x 140 (D), each floor height 40.
// We'll build per-floor faces from front, side(left) and top.

const FLOORS = 7;
const FH = 36;
const W = 220; // front width
const D = 130; // depth (oblique)
const dx = Math.cos(Math.PI / 6) * D; // ~112
const dy = Math.sin(Math.PI / 6) * D; // ~65

// origin = top-left of front face base
const OX = 230;
const OY = 480;

type Face = { points: string; fill: string; stroke?: string };

function frontFloor(i: number): Face[] {
  // i: 0..6, F1 at bottom
  const y0 = OY - i * FH;
  const y1 = y0 - FH;
  const x0 = OX;
  const x1 = OX + W;
  const faces: Face[] = [];
  const isBrick = i === 0 || i === FLOORS - 1;
  const fill = isBrick ? BRICK : CLT;
  faces.push({
    points: `${x0},${y0} ${x1},${y0} ${x1},${y1} ${x0},${y1}`,
    fill,
  });
  // Glazing strip on CLT floors (not brick), WWR 0.45 -> band height 45% of floor
  if (!isBrick) {
    const bandH = FH * 0.45;
    const by0 = y0 - FH * 0.3;
    const by1 = by0 - bandH;
    // 4 panels with mullions
    const panels = 4;
    const gap = 8;
    const inner = W - gap * (panels + 1);
    const pw = inner / panels;
    for (let p = 0; p < panels; p++) {
      const px0 = x0 + gap + p * (pw + gap);
      const px1 = px0 + pw;
      faces.push({
        points: `${px0},${by0} ${px1},${by0} ${px1},${by1} ${px0},${by1}`,
        fill: GLAZE,
      });
    }
  }
  return faces;
}

function sideFloor(i: number): Face[] {
  const y0 = OY - i * FH;
  const y1 = y0 - FH;
  const x0 = OX;
  const xTop0 = x0 - dx;
  const yTop0 = y0 - dy;
  const yTop1 = y1 - dy;
  const isBrick = i === 0 || i === FLOORS - 1;
  const fill = isBrick ? BRICK : CLT;
  return [
    {
      points: `${x0},${y0} ${xTop0},${yTop0} ${xTop0},${yTop1} ${x0},${y1}`,
      fill,
    },
  ];
}

function roofTop(): Face {
  const y = OY - FLOORS * FH;
  const x0 = OX;
  const x1 = OX + W;
  return {
    points: `${x0},${y} ${x1},${y} ${x1 - dx},${y - dy} ${x0 - dx},${y - dy}`,
    fill: "#D5D2CB",
  };
}

// Concrete core: a central shaft running all 7 floors, shown as a vertical band
// on front + side, extruded slightly forward.
function concreteCore(): Face[] {
  const cw = 46; // core width on front
  const cd = 36; // core depth
  const cx0 = OX + W / 2 - cw / 2;
  const cx1 = cx0 + cw;
  const cy0 = OY;
  const cy1 = OY - FLOORS * FH;
  // Forward offset to "pop" out of facade
  const fOx = 22;
  const fOy = -12;
  // Front
  const f = {
    points: `${cx0 + fOx},${cy0 + fOy} ${cx1 + fOx},${cy0 + fOy} ${cx1 + fOx},${cy1 + fOy} ${cx0 + fOx},${cy1 + fOy}`,
    fill: CONCRETE,
  };
  // Right side of core
  const sx = Math.cos(Math.PI / 6) * cd;
  const sy = Math.sin(Math.PI / 6) * cd;
  const r = {
    points: `${cx1 + fOx},${cy0 + fOy} ${cx1 + fOx + sx},${cy0 + fOy - sy} ${cx1 + fOx + sx},${cy1 + fOy - sy} ${cx1 + fOx},${cy1 + fOy}`,
    fill: "#76746E",
  };
  // Top of core
  const t = {
    points: `${cx0 + fOx},${cy1 + fOy} ${cx1 + fOx},${cy1 + fOy} ${cx1 + fOx + sx},${cy1 + fOy - sy} ${cx0 + fOx + sx},${cy1 + fOy - sy}`,
    fill: "#9C9A93",
  };
  return [f, r, t];
}

export function AxonometricPanel() {
  const frontFaces: Face[] = [];
  const sideFaces: Face[] = [];
  for (let i = 0; i < FLOORS; i++) {
    sideFaces.push(...sideFloor(i));
    frontFaces.push(...frontFloor(i));
  }

  return (
    <div className="p-6">
      <div className="text-[11px] uppercase tracking-wider text-[#6a6a66] mb-4">
        105 Carrer de Pujades · 22@ Poblenou — material zones · A1–A3 scope
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox="0 0 900 560"
          className="w-full h-auto"
          style={{ maxWidth: 900, display: "block", margin: "0 auto" }}
        >
          {/* ground line */}
          <line
            x1={OX - dx - 20}
            y1={OY - dy + 6}
            x2={OX + W + 40}
            y2={OY + 6}
            stroke="#cccac4"
            strokeWidth={1}
          />

          {/* Side then front for depth illusion */}
          {sideFaces.map((f, i) => (
            <polygon
              key={`s${i}`}
              points={f.points}
              fill={shade(f.fill, -0.12)}
              stroke={STROKE}
              strokeWidth={0.6}
            />
          ))}
          {/* Roof */}
          {(() => {
            const r = roofTop();
            return (
              <polygon points={r.points} fill={r.fill} stroke={STROKE} strokeWidth={0.6} />
            );
          })()}
          {/* Front */}
          {frontFaces.map((f, i) => (
            <polygon
              key={`f${i}`}
              points={f.points}
              fill={f.fill}
              stroke={f.fill === GLAZE ? "#7da9bf" : STROKE}
              strokeWidth={0.6}
            />
          ))}
          {/* Concrete core on top */}
          {concreteCore().map((f, i) => (
            <polygon
              key={`c${i}`}
              points={f.points}
              fill={f.fill}
              stroke={STROKE}
              strokeWidth={0.6}
            />
          ))}

          {/* Floor labels on the left edge (side face) */}
          {Array.from({ length: FLOORS }).map((_, i) => {
            const y = OY - i * FH - FH / 2 - dy;
            const x = OX - dx - 12;
            return (
              <text
                key={`fl${i}`}
                x={x}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fill="#3a3a36"
                fontFamily="Inter, system-ui, sans-serif"
              >
                F{i + 1}
              </text>
            );
          })}

          {/* Callouts right side */}
          {/* Reclaimed brick (top floor F7) */}
          <Callout
            x1={OX + W}
            y1={OY - (FLOORS - 0.5) * FH}
            x2={760}
            y2={70}
            label="Reclaimed brick"
            sub="GF + F7 · source 800 m · ~0 kg CO₂e/kg"
            color={BRICK}
          />
          {/* CLT timber (mid floor F4) */}
          <Callout
            x1={OX + W}
            y1={OY - 3.5 * FH}
            x2={760}
            y2={230}
            label="CLT timber"
            sub="floors 2–7 · source < 40 km · −0.9 kg CO₂e/kg"
            color={CLT}
          />
          {/* Concrete core */}
          <Callout
            x1={OX + W / 2 + 30}
            y1={OY - 5 * FH - 12}
            x2={760}
            y2={380}
            label="Concrete core"
            sub="45% mass · cast in-situ"
            color={CONCRETE}
          />
          {/* Reclaimed brick GF */}
          <Callout
            x1={OX + W}
            y1={OY - 0.5 * FH}
            x2={760}
            y2={490}
            label="Reclaimed brick (GF)"
            sub="ground floor cladding"
            color={BRICK}
          />
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-[#3a3a36] justify-center">
        <LegendItem color={CONCRETE} label="Concrete core" />
        <LegendItem color={CLT} label="CLT timber (F2–F7)" />
        <LegendItem color={BRICK} label="Reclaimed brick (GF + F7)" />
        <LegendItem color={GLAZE} label="Glazing · WWR 0.45" />
      </div>
    </div>
  );
}

function Callout({
  x1,
  y1,
  x2,
  y2,
  label,
  sub,
  color,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  sub: string;
  color: string;
}) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2 - 8} y2={y2} stroke="#3a3a36" strokeWidth={0.6} />
      <circle cx={x1} cy={y1} r={2.5} fill={color} stroke="#2b2b2b" strokeWidth={0.5} />
      <rect x={x2 - 6} y={y2 - 14} width={4} height={28} fill={color} />
      <text
        x={x2 + 4}
        y={y2 - 2}
        fontSize={11}
        fontWeight={600}
        fill="#1a1a1a"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {label}
      </text>
      <text
        x={x2 + 4}
        y={y2 + 11}
        fontSize={9.5}
        fill="#6a6a66"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {sub}
      </text>
    </g>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block w-3 h-3 rounded-sm"
        style={{ background: color, border: "1px solid #2b2b2b22" }}
      />
      <span>{label}</span>
    </div>
  );
}

function shade(hex: string, pct: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const f = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + (pct < 0 ? c * pct : (255 - c) * pct))));
  const to = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to(f(r))}${to(f(g))}${to(f(b))}`;
}
