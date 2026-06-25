# Delta Carbon — Full Development Summary
## IAAC Barcelona · MaAI01 · Group 10.2
**Team:** Bhavana Priya · Martina Simoni · Rashi Desadla · Rim Choufani
**Date:** June 2026

---

## What Delta Carbon is

Delta Carbon is a Rhino-integrated upfront carbon assessment tool for architects at the earliest stage of design — the massing stage, before any structural or material decision is locked in. The architect imports their Rhino model, assigns materials to building elements, receives AI-powered material suggestions grounded in verified EPD data (BEDEC/ITeC via 2050-materials API), selects local suppliers via a map, and gets a live carbon total covering both manufacturing (A1–A3) and transport (A4) impact.

The tool is built around a regenerative argument: by activating biogenic materials (CLT, timber, straw), the tool can produce a **negative upfront carbon total** — a building that stores more carbon than its construction emits.

---

## Final folder structure

```
delta-carbon/
├── plugin/          ← C# Rhino plugin (DeltaCarbon.rhp)
├── frontend/        ← React + Vite + TypeScript
├── backend/         ← FastAPI Python
├── pipeline/
│   ├── epd/         ← Bhavana EPD pipeline (2050-materials API)
│   ├── geometry/    ← Rashi OBJ geometry processor
│   └── visualisation/ ← Rim texture/render pipeline
├── .gitignore
├── .env.example
└── README.md
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 7, TypeScript, TanStack Router, Zustand, Three.js, Mapbox GL, Recharts, jsPDF |
| Backend | FastAPI, Python 3.14, Uvicorn, Anthropic SDK, OpenAI SDK, python-dotenv |
| AI — material suggestions | RAG: 2050-materials API (BEDEC/ITeC, country=ES) + Claude claude-sonnet-4-6 |
| AI — renders | DALL-E 3 via OpenAI API |
| Rhino plugin | C# .NET 4.8, Eto.Forms, Rhino 8 |
| Maps | Mapbox GL (3D viewer + supplier map), Google Maps (Places Autocomplete + Distance Matrix) |
| Carbon data | BEDEC/ITeC via 2050-materials API |

---

## Carbon scope

- **In scope:** A1–A3 (raw material supply, transport to manufacturer, manufacturing) + A4 (transport to site)
- **Out of scope:** A5, B stages, C stages, Stage D
- **Transport factor:** 0.062 kg CO₂e per tonne-km (road freight)
- **Benchmark:** 280 kg CO₂e/m² (Architecture 2030, RMI 2026)

---

## Complete user flow

1. **Login** — mock Google login, persisted in localStorage
2. **Dashboard** — project list with CO₂ totals, regenerative badges, options count
3. **Create Project** — name, building use, location (Google Maps Autocomplete), GFA, floors
4. **Project workspace** — split layout: Three.js viewer left, sidebar right
5. **Sync from Rhino** — run `DeltaCarbonSync` in Rhino, geometry fetched automatically
6. **Building elements** — Foundation, Structure, Envelope, Floors, Roof with live CO₂ per element
7. **Carbon insights** — bar chart showing worst offender
8. **AI material suggestions** — RAG pipeline: BEDEC/ITeC EPD retrieval + Claude LLM ranks 3–5 alternatives
9. **Suppliers** — dedicated tab with pre-populated Spanish/EU supplier list, Mapbox map with pins and route, A4 transport CO₂ calculation
10. **Save Options** — snapshot current configuration as Option 1, Option 2, etc.
11. **Compare** — dedicated tab with per-option material breakdown, CO₂ per element, grouped bar chart, DALL-E 3 render
12. **Download Passport** — per-option Material Passport PDF (jsPDF), scope A1–A4, BEDEC/ITeC cited

---

## Navigation structure

Three top-level tabs inside the workspace:
- **3D Model** — viewer + sidebar (sections 01–08)
- **Suppliers** — regional supplier list + Mapbox map + A4 calculation
- **Compare** — option comparison with renders, material breakdown, chart

Routes:
- `/login` — login page
- `/dashboard` — project list
- `/` — workspace (requires login + active project)
- `/compare` — standalone compare page (also available inline via tab)

---

## Rhino plugin (DeltaCarbon.rhp)

### Commands
- `DeltaCarbonSync` — exports OBJ + posts geometry JSON to frontend
- `DeltaCarbonAnalyze` — full analysis pipeline
- `DeltaCarbonSetOrigin` — sets EarthAnchorPoint
- `DeltaCarbonExport` — PDF export stub
- `DeltaCarbonMaterials` — material picker stub

### Panel UI
Minimal docked panel with two buttons:
- **Choose Project** — opens browser on localhost:8080, polls `/api/plugin/project` every 3 seconds for selected project name
- **Sync ↑** — disabled until a project is selected; runs `DeltaCarbonSync`; shows "SYNCING..." during execution; updates last sync time

### Key behaviour
- Plugin does NOT send geographic coordinates to the frontend — only geometry (OBJ + element volumes)
- `searchLocation` (project location) is set only via Google Maps Autocomplete in the frontend — never overwritten by Rhino
- Invalid EarthAnchorPoint coordinates (e.g. `-1.234e+308`) are validated and discarded

---

## Backend endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check |
| `/v1/carbon/estimate` | POST | Baseline carbon from geometry (BEDEC/ITeC coefficients) |
| `/v1/suggestions` | POST | RAG: EPD retrieval + Claude LLM material suggestions |
| `/v1/render` | POST | DALL-E 3 architectural render generation |

### How to start the backend
```bash
cd backend
python -c "import uvicorn; uvicorn.run('main:app', host='127.0.0.1', port=8000)"
```
Note: Python 3.14 incompatibility with uvicorn's `--reload` flag. Use the above command instead of `uvicorn main:app --reload`.

---

## Frontend key files

| File | Description |
|---|---|
| `frontend/src/state/building.ts` | Zustand store — Project, ProjectOption, auth state, elements, transport, selected element. Persisted to localStorage via `persist` middleware. |
| `frontend/src/lib/materials.ts` | 26-material EPD library with BEDEC/ITeC coefficients |
| `frontend/src/lib/carbon.ts` | Carbon calculation: `totalCO2kg(elements, transportCo2Kg)` |
| `frontend/src/lib/passport.ts` | jsPDF Material Passport generation — per-option, scope A1–A4 |
| `frontend/src/lib/suppliers.ts` | 11 real Spanish/EU suppliers with coordinates and material IDs |
| `frontend/src/components/carbon/BuildingViewer.tsx` | Three.js viewer — shaded grey view, per-element materials, element highlighting |
| `frontend/src/components/carbon/sections/OptimizeSection.tsx` | AI material suggestions — live RAG via backend, fallback to local library |
| `frontend/src/components/carbon/sections/OptionsSection.tsx` | Save/load/rename/delete options, passport download per option |
| `frontend/src/components/carbon/views/SuppliersView.tsx` | Suppliers tab — regional list, Mapbox map, A4 calculation |
| `frontend/src/components/carbon/views/CompareView.tsx` | Compare tab — renders, material breakdown, chart, summary table |

---

## BEDEC/ITeC carbon coefficients (A1–A3)

| Material | kg CO₂e/m³ | Source |
|---|---|---|
| Concrete C30/37 | +312 | BEDEC/ITeC |
| Concrete C20/25 | +258 | BEDEC/ITeC |
| Structural steel | +11,461 | BEDEC/ITeC |
| Brick, red | +432 | BEDEC/ITeC |
| CLT | −400 | BEDEC/ITeC |
| Timber / Plywood | −420 | BEDEC/ITeC |
| Straw panels | −120 | BEDEC/ITeC |
| Expanded cork | −100 | BEDEC/ITeC |

---

## Supplier database (pre-populated)

| Supplier | Material | Location |
|---|---|---|
| Egoin | CLT | Zamudio, Spain |
| Arboreal | CLT | Galicia, Spain |
| Hasslacher | CLT | Sachsenburg, Austria |
| KLH Massivholz | CLT | Teufenbach, Austria |
| Celsa Group | Structural steel | Barcelona, Spain |
| Acerinox | Structural steel | Madrid, Spain |
| Acciona | Concrete | Madrid, Spain |
| LafargeHolcim Spain | Concrete | Barcelona, Spain |
| Terreal Ibérica | Brick | Valencia, Spain |
| Cobert | Brick | Tarragona, Spain |
| Isobloc | Straw panels | Lleida, Spain |

---

## API keys required

**`backend/.env`**
```
ANTHROPIC_API_KEY=        ← Claude claude-sonnet-4-6 for material suggestions
EPD_API_TOKEN=            ← 2050-materials API for BEDEC/ITeC EPD retrieval
OPENAI_API_KEY=           ← DALL-E 3 for architectural renders
```

**`frontend/.env`**
```
VITE_GOOGLE_MAPS_API_KEY= ← Maps JS API + Places API (New) + Distance Matrix + Routes API
VITE_MAPBOX_TOKEN=        ← Mapbox GL for 3D viewer and supplier map
```

---

## What was built from scratch (not in original codebase)

- Login page + mock auth
- Dashboard with project cards
- Create Project modal with Google Maps Autocomplete
- Project persistence in localStorage (Zustand persist)
- Options system (save/load/rename/delete snapshots)
- Top navigation (3D Model | Suppliers | Compare)
- Suppliers view with regional pre-populated list + Mapbox map + A4 calculation
- Compare view with DALL-E 3 renders + material breakdown + chart
- Import OBJ button (manual model upload)
- Shaded grey Three.js view with per-element materials
- Element highlighting in 3D viewer
- FastAPI backend with RAG pipeline
- DALL-E 3 render endpoint
- Rhino panel redesign (Choose Project + Sync)
- Full rename: SURROUND → Delta Carbon throughout codebase
- Folder restructure: 4 separate team folders → unified delta-carbon structure

---

## Known issues / limitations

- Python 3.14 incompatibility with uvicorn `--reload` — use direct Python invocation
- Rhino panel is a docked panel but does not auto-open — user must open manually or via command
- DALL-E 3 renders require OpenAI API credits (~$0.04/image)
- EPD API coverage thinner outside Spain/Western Europe
- A5, B, C, D lifecycle stages out of scope — declared proactively in passport
- Element highlighting requires OBJ layers to be named with recognisable keywords (foundation, structure, envelope, floor, roof)

---

## How to run

```bash
# Terminal 1 — Backend
cd backend
python -c "import uvicorn; uvicorn.run('main:app', host='127.0.0.1', port=8000)"

# Terminal 2 — Frontend
cd frontend
npm run dev

# Rhino plugin
# Build: cd plugin && dotnet build DeltaCarbon.csproj -c Debug
# Install: PlugInManager → Install → plugin/bin/Debug/net48/DeltaCarbon.rhp
# Use: DeltaCarbonSync command in Rhino command line
```

---

*Summary authored June 2026 · IAAC Barcelona · MaAI01 · Prof. Emanuele Naboni*
