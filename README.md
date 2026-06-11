# SURROUND Upfront Carbon

Real-time embodied carbon assessment for Rhino 7/8 — massing stage, no LCA training required.

**Team:** Bhavana Priya · Martina Simoni · Rashi Desadla · Rim Choufani  
**Status:** Active development — branch `bhavana`

---

## What it does

SURROUND connects a Rhino plugin to a React web interface. You select a real plot on the map, send it to Rhino as the model origin, build your massing at (0,0,0), then run one command to sync geometry to the web. The interface calculates embodied carbon (A1–A3) broken down by building element and displays the result on the map in 3D.

```
Web interface                    Rhino 8
─────────────────────────────    ──────────────────────────
1. Select plot on map
2. Click "Send to Rhino"    →    3. Run SurroundSetOrigin
                                    (sets EarthAnchorPoint)
                                 4. Build model at (0,0,0)
                                 5. Run SurroundSync       →  6. Model appears on map
                                                               at selected plot with
                                                               CO₂ breakdown in sidebar
```

---

## Setup

See [REQUIREMENTS.md](REQUIREMENTS.md) for full system requirements.

### 1. Build the Rhino plugin

Close Rhino first, then:

```powershell
cd SurroundPlugin
dotnet build -c Debug
```

Output: `bin\Debug\net48\SurroundPlugin.rhp`

### 2. Load into Rhino

Drag and drop `SurroundPlugin.rhp` onto the Rhino viewport. The plugin registers the following commands:

| Command | What it does |
|---|---|
| `SurroundSetOrigin` | Reads the plot selected in the browser and sets the Rhino EarthAnchorPoint to that location |
| `SurroundSync` | Reads all Brep/Extrusion geometry, computes volumes per layer, and sends to the web interface |
| `SurroundAnalyze` | Standalone carbon analysis (sends to SURROUND cloud API) |
| `SurroundMaterials` | Opens material picker dialog |
| `SurroundExport` | Exports a Material Passport PDF |

### 3. Configure the local URL (once per machine)

```powershell
cmdkey /generic:SurroundPlugin_URL /user:surround /pass:http://localhost:8080
```

This tells the plugin to POST to the local web interface instead of the Railway deployment.

### 4. Start the web interface

```powershell
cd SurroundPlugin\Frontend
bun install   # first time only
bun run dev
```

Opens at `http://localhost:8080`.

---

## Workflow

### Select a plot and sync to Rhino

1. Open `http://localhost:8080` in a browser
2. Browse the map — click any green dot or any existing 3D building to select a plot
3. In the **Site** sidebar panel, click **Send to Rhino**
4. In Rhino, run `SurroundSetOrigin` — this sets the EarthAnchorPoint to the selected plot's coordinates
5. Build or adjust your massing model at the origin `(0, 0, 0)` in Rhino
6. Run `SurroundSync` — the model appears on the map at the selected plot, and the sidebar updates with the carbon breakdown

### Material assignment

Layers are classified automatically by keyword matching:

| Layer name contains | Assigned element |
|---|---|
| `foundation`, `base`, `pile`, `footing` | Foundation |
| `structure`, `column`, `beam`, `slab`, `core` | Structure |
| `wall`, `facade`, `envelope`, `curtain`, `cladding` | Envelope |
| `floor`, `deck`, `ceiling` | Floors |
| `roof`, `canopy` | Roof |

Unrecognised layers are included in the total volume but not broken down. Rename your layers to match the keywords above for a complete breakdown.

Recommended layer names:

```
SURROUND_Foundation
SURROUND_Structure
SURROUND_Envelope
SURROUND_Floors
SURROUND_Roof
```

### Changing materials in the web interface

After syncing, open the **Building Elements** section in the sidebar to change the material assigned to each element. Carbon totals update immediately. The **CO₂ Results** section shows the total in tonnes and kg/m².

---

## Architecture

### Rhino–web bridge

The Vite dev server runs a custom Node.js middleware (`rhinoBridge` in `vite.config.ts`) that intercepts requests before the Cloudflare plugin. It exposes two endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `/v1/carbon/estimate` | `POST` | Receives geometry + carbon data from Rhino plugin |
| `/v1/carbon/estimate` | `GET` | Frontend polls this every 2s to pick up new data |
| `/api/plot/select` | `POST` | Web frontend stores the selected plot here |
| `/api/plot/select` | `GET` | Rhino plugin reads the selected plot before syncing |

The frontend polls `GET /v1/carbon/estimate` every 2 seconds. When a new sync arrives (`updatedAt` timestamp advances), it calls `loadFromRhino` — one atomic Zustand state update that sets dims, element volumes, and location together to avoid race conditions.

### Carbon calculation

EPD coefficients (A1–A3) from MaterialePyramiden (CINARK / Royal Danish Academy):

| Element | Default material | kg CO₂e / m³ |
|---|---|---|
| Foundation / Structure | Concrete C30/37 | 282 |
| Envelope | Brick | 297 |
| Floors | Concrete C20 | 215 |
| Roof | Structural Steel | 5,403 |

These are applied in `vite.config.ts` middleware when the Rhino plugin POST arrives. Users can override per-element in the sidebar.

### State management

Zustand store in `src/state/building.ts`. Key actions:

| Action | What it does |
|---|---|
| `loadFromRhino(dims, volumes, location)` | Atomic update: sets dims + element volumes + map location in one call |
| `setSelectedParcel(parcel)` | Sets the active plot (triggers map highlight + Send to Rhino button) |
| `setPlotCenter(latlon)` | Sets the map centre for the selected plot |

### Map

Mapbox GL JS with 3D fill-extrusion layers. The map loads available plots from `/barcelona-all-plots.geojson` (static file in `/public`). Clicking a plot highlights it and enables **Send to Rhino**. When a Rhino sync arrives, the map flies to the model location and renders the building footprint extruded to the correct height.

---

## File structure

```
SurroundPlugin/
├── Commands/
│   ├── SurroundAnalyze.cs
│   ├── SurroundExport.cs
│   ├── SurroundMaterials.cs
│   ├── SurroundSetOrigin.cs     ← reads web plot, sets EarthAnchorPoint
│   └── SurroundSync.cs          ← syncs geometry to web interface
├── Core/
│   ├── APIClient.cs             ← HTTP POST to localhost:8080/v1/carbon/estimate
│   ├── CarbonCalculator.cs
│   ├── GeometryAnalyzer.cs      ← extracts Brep volumes per layer
│   └── MaterialDatabase.cs
├── Models/
├── Properties/AssemblyInfo.cs   ← plugin GUID (required)
├── SurroundPlugin.cs
└── SurroundPlugin.csproj        ← net48, x64, copies dll → rhp after build

Frontend/
├── src/
│   ├── components/carbon/
│   │   ├── MapView.tsx           ← Mapbox map + plot markers + 3D building
│   │   ├── Sidebar.tsx           ← accordion: Site / Elements / Results / Optimize
│   │   └── sections/
│   │       ├── MapInfoSection.tsx   ← search + parcel info + Send to Rhino button
│   │       ├── ElementsSection.tsx  ← per-element material picker
│   │       ├── ResultsSection.tsx   ← total CO₂ + charts
│   │       └── OptimizeSection.tsx
│   ├── state/building.ts         ← Zustand store
│   └── routes/index.tsx          ← useRhinoSync + usePlotBroadcast hooks
└── vite.config.ts                ← rhinoBridge middleware (intercepts before Cloudflare)
```

---

## Accuracy

SURROUND provides early-stage estimates only. Current mean error: **±18%** vs buildings with verified EPDs.

| Use | OK |
|---|---|
| Comparing structural systems | Yes |
| Setting early-stage carbon budgets | Yes |
| Client feasibility presentations | Yes |
| Final EPD submission | No |
| LEED/BREEAM credit calculations | No |
| Building permit applications | No |

---

## References

- RhinoCommon SDK: developer.rhino3d.com
- MaterialePyramiden EPD database: materialepyramiden.dk
- Architecture 2030 Embodied Carbon Target: architecture2030.org
- SURROUND neighbourhood database: 22@ Poblenou, Barcelona (1,691 buildings)
