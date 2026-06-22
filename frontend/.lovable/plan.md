# Embodied Carbon Tool — Plan

A professional LCA-style web app: 3D building viewport + material selection sidebar + real-time CO₂ math + PDF passport. Pine green on white, IBM Plex Sans, Rhino/lcabyg.dk feel.

## Layout

```
+------------------------------------------------------------+
| HEADER 60px  EMBODIED CARBON TOOL / Barcelona Poble Nou    |
+--------------------------------------------+---------------+
|                                            |  SIDEBAR      |
|  3D VIEWPORT (Three.js)                    |  380px        |
|  - White bg, faint grid                    |  Collapsible  |
|  - Context buildings (white)               |  sections     |
|  - User building (pine green #2C5F4C)      |               |
|  - Orbit controls                          |               |
+--------------------------------------------+---------------+
| FOOTER 70px  Stats + Reset + Download Passport             |
+------------------------------------------------------------+
```

Sidebar sections (accordion):
1. **Import Model** — upload `.obj` / `.gltf` (`.ifc` deferred, see notes) OR box-massing sliders (H/W/D)
2. **Building Elements** — list: Foundation / Structure / Envelope / Floors / Roof, each with editable volume m³
3. **Material Selection** — per element, grouped dropdown by category (Wood/Biobased, Mineral, Metal, Insulation), each option labeled `Name — kg CO₂/m³`
4. **CO₂ Results** — big total in tCO₂e + per-element horizontal bar chart
5. **Optimization Suggestions** — auto-generated swap recommendations, click to apply

## Routes & Files

Single-page tool — one route.

- `src/routes/index.tsx` — page shell, layout grid
- `src/components/carbon/Viewport.tsx` — Three.js scene, OrbitControls, GLTF/OBJ loader, building mesh + context blocks
- `src/components/carbon/Sidebar.tsx` — accordion container
- `src/components/carbon/sections/ImportSection.tsx`
- `src/components/carbon/sections/ElementsSection.tsx`
- `src/components/carbon/sections/MaterialsSection.tsx`
- `src/components/carbon/sections/ResultsSection.tsx` (bar chart via recharts)
- `src/components/carbon/sections/OptimizeSection.tsx`
- `src/components/carbon/Footer.tsx`
- `src/components/carbon/Header.tsx`
- `src/lib/materials.ts` — MaterialePyramiden dataset (JSON constant) + types
- `src/lib/carbon.ts` — calc helpers (per-element CO₂, totals, optimization suggestions)
- `src/lib/passport.ts` — jsPDF passport generation (captures viewport canvas as image + table)
- `src/state/building.ts` — Zustand store: `elements[]`, `setMaterial`, `setVolume`, `loadModel`, `reset`

## Data model

```ts
type Category = 'wood' | 'mineral' | 'metal' | 'insulation';
type Material = { id: string; name: string; category: Category; co2PerM3: number };
type ElementKind = 'foundation' | 'structure' | 'envelope' | 'floors' | 'roof';
type BuildingElement = { id: string; kind: ElementKind; label: string; volumeM3: number; materialId: string };
```

Calc: `co2 = volumeM3 × material.co2PerM3` per element; total in tonnes = `Σ / 1000`.

Optimizer: for each element, find lowest-CO₂ material in same category (or cross-category if user opts in) and report `delta = (current - candidate) × volume`. Show top 3 suggestions sorted by savings.

## Starter state

Box 25×25×60 m, split into placeholder elements with sensible default volumes and materials (Concrete C30/37 for foundation+structure, brick envelope, concrete floors, steel roof). User sees ~thousands of tCO₂ immediately and can start swapping.

## Design tokens (src/styles.css)

Override theme:
- `--background`: white (`oklch(1 0 0)`)
- `--foreground`: near-black
- `--primary`: pine green `oklch(0.42 0.05 155)` (≈ #2C5F4C) + `--primary-foreground` white
- `--border`: light gray
- Font: IBM Plex Sans via Google Fonts `<link>` in `__root.tsx` head, applied through `body { font-family: 'IBM Plex Sans', sans-serif }` in `styles.css`
- No gradients, no purple/blue, minimal shadows, 1px borders, small radius (0.25rem)

## 3D viewport details

- `three` + `OrbitControls` + `GLTFLoader` + `OBJLoader` (from `three/examples/jsm/...`)
- Scene: white bg, `GridHelper` (subtle gray), hemispheric + directional light
- Context: ~30 small white extruded boxes around origin to evoke Poble Nou block grid
- User building: single mesh, pine-green `MeshStandardMaterial`, replaced when model uploaded (bounding box → auto-volume estimate per element via heuristic split: bottom 5% foundation, next 90% structure+floors, shell envelope, top roof)
- Resize observer for canvas

## PDF passport (jsPDF)

- Title + location + date
- Snapshot of viewport (`renderer.domElement.toDataURL()`)
- Table: Element | Material | Volume (m³) | kg CO₂/m³ | Total tCO₂
- Grand total

## Dependencies to add

`three`, `@types/three`, `zustand`, `jspdf`, `recharts`. (`recharts` only if not already; otherwise use simple CSS bars to keep bundle lean — will check.)

## Notes / scope

- `.ifc` parsing requires `web-ifc` (large WASM). Will mark `.ifc` as "coming soon" in the upload UI unless you want it included now.
- Volume auto-detection from arbitrary GLTF meshes is approximate (bbox-based). Real per-mesh volume integration is possible but heavier — using bbox heuristic for v1.
- Material dataset uses the exact values listed in your spec.

## Open questions

1. Include `.ifc` upload now (adds ~3MB WASM) or ship `.obj`/`.gltf` only with "IFC coming soon"?
2. For optimization, restrict swaps to same category (safer structurally) or allow cross-category (e.g. concrete → CLT) for max impact?

I'll proceed with `.obj`/`.gltf` only and same-category swaps unless you say otherwise.
