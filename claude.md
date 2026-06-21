# Claude Context — Early Carbon
## IAAC Barcelona · MaAI01 · Group 10.2
**Last updated:** 21 June 2026 (post-audit)

---

## Who we are

Team: Bhavana Priya · Martina Simoni · Rashi Desadla · Rim Choufani
Course: MaAI01 — AI Application for Regenerative Design, IAAC Barcelona
Professor: Emanuele Naboni
Presentation: Thursday 25 June 2026, IAAC Barcelona
Upload deadline: Wednesday 24 June, midnight

---

## What the project is

**Early Carbon** is a Rhino-integrated upfront carbon assessment tool for architects at the earliest stage of design — the massing stage, before any structural or material decision is locked in.

The tool was previously called **SURROUND**. That name is dead. It is now **Early Carbon**. Do not refer to it as SURROUND unless specifically discussing the upload folder name (which the professor set as SURROUND and cannot be changed).

The upload folder name remains: SURROUND_01_Presentation, SURROUND_02_Demo, SURROUND_03_Tool.

---

## What the tool does — user flow

1. **Site** — architect searches a city, address, or place. The project plot is geolocated. This drives supplier distance calculations downstream.

2. **Import geometry** — architect imports their Rhino model via the Early Carbon Rhino plugin. Geometry is pulled automatically. No manual volume entry.

3. **Building elements** — tool breaks the model into: Foundation, Structure (columns/beams), Envelope (façade), Floors/slabs, Roof. Each element shows current material + CO₂ contribution in tonnes.

4. **Material assignment** — architect assigns materials from the library. Live CO₂ total updates immediately.

5. **AI material suggestions** — architect requests alternatives for any element. RAG engine retrieves from BEDEC/ITeC via 2050-materials API (country="ES"), passes to Claude claude-sonnet-4-6, returns 3–5 alternatives with: material name, kg CO₂e/m³, one-line suitability note, source tag, delta figure (tonnes saved). Architect clicks Apply, total updates.

6. **Supplier matching** — Google Maps autocomplete search bar. Tool calculates road distance from supplier to project plot via Google Maps Distance Matrix API. Transport CO₂ = distance × material weight × 0.062 kg CO₂e/tonne-km. Added to A1–A3 total to give A1–A4.

7. **Output** — total upfront carbon in tonnes CO₂e (A1–A4), broken down by element. Downloadable PDF passport.

---

## The AI architecture decision

**Material suggestions use RAG (Retrieval-Augmented Generation).** Not a plain API call, not a simple lookup table.

- BEDEC/ITeC data is retrieved live via the 2050-materials API at query time with `country="ES"`
- Query = element type + current material + volume + building use type + location
- API returns top matches; LLM (Claude claude-sonnet-4-6) reasons over retrieved entries and returns ranked suggestions with reasoning
- Implementation: `bhavana/pipeline/epd_api.py` → `search_epds(keyword, country="ES")` → FastAPI `backend/main.py` → `OptimizeSection.tsx`
- The implementation calls the API live rather than using a pre-built vector store — simpler and more reliable for the demo

**Note on RAG description for presentation:** Say "retrieves from BEDEC/ITeC database at query time" — do not say "vector store" unless asked, since the current implementation uses live API calls.

**Supplier matching does not use AI.** It uses Google Maps Places Autocomplete + Distance Matrix API + standard road freight emission factor. Simple, reliable, defensible.

---

## The regenerative argument — the core of everything

This is the thread that opens and closes the presentation. Never lose sight of it.

**The question:** can a building give back more carbon than it takes to build?

**The chain:**
1. Upfront carbon is locked in before occupation — it cannot be recovered operationally
2. At the massing stage, material decisions are still open — the only moment they can be changed
3. Biogenic materials (CLT, timber, straw) carry negative A1–A3 coefficients — they store more CO₂ than they emit in manufacture
4. Early Carbon makes this visible, element by element, in the first hour of design
5. The AI suggests the path — concrete to CLT, brick to timber cladding
6. The supplier map makes it real — not a theoretical swap but an actual sourcing decision
7. The tool prints a negative total — a building that stores more carbon than its construction emits

**The answer:** yes. And here is the number.

The professor calls this the "regenerative journey." It is the framing device that distinguishes the project from a sustainability tool. Most tools stop at doing less harm. Early Carbon can print a negative number. That is the rarest result a tool can produce.

---

## Key figures and sources

| Material | kg CO₂e/kg (A1–A3) | Density | kg CO₂e/m³ | Source |
|---|---|---|---|---|
| Concrete C30/37 | +0.13 | 2400 kg/m³ | +312 | BEDEC/ITeC |
| Concrete C20/25 | — | 2400 kg/m³ | +258 | BEDEC/ITeC |
| Structural steel | +1.46 | 7850 kg/m³ | +11,461 | BEDEC/ITeC |
| Brick (red) | +0.24 | 1800 kg/m³ | +432 | BEDEC/ITeC |
| CLT / Glulam | −0.80 | 500 kg/m³ | −400 | BEDEC/ITeC |
| Construction timber | −0.70 | 600 kg/m³ | −420 | BEDEC/ITeC |
| Straw panels | −1.00 | 120 kg/m³ | −120 | BEDEC/ITeC |

These values are implemented and verified in `materials.ts`, `vite.config.ts`, `backend/main.py`, and `CarbonCalculator.cs`. All files are aligned.

Key stats for the problem slide:
- 39% of global energy-related carbon emissions from buildings (Architecture 2030, RMI 2026)
- 11% is embodied carbon — locked in before occupation (Architecture 2030, RMI 2026)
- 50% of all new construction's lifetime emissions will be upfront carbon by 2050 (World Green Building Council, 2025)
- 70% of sustainability decisions made in early design phase (Luo et al., Journal of Cleaner Production, 2025)

---

## Data sources

| Source | What it provides |
|---|---|
| BEDEC / ITeC | CO₂ coefficients per material — search "fusta contralaminada" for CLT — accessed via 2050-materials API, country="ES" |
| CINARK / Royal Danish Academy | Construction Materials Pyramid, ~60 materials, materialepyramiden.dk — reference only, NOT a cited source in the tool or PDF |
| EPD database (verified) | Environmental Product Declarations — retrieved via 2050-materials API |
| Google Maps Platform | Places Autocomplete + Distance Matrix API |

**Important:** BEDEC/ITeC (via 2050-materials API) is the declared data source everywhere in the tool. Do not cite MaterialePyramiden in any user-facing output. Several bugs remain in `passport.ts` where it still cites MaterialePyramiden incorrectly — these need fixing before the demo.

---

## Scope — what to declare proactively

**In scope:** A1–A3 + A4
**Out of scope (say this before the jury asks):** A5, B stages, C stages, Stage D

Note: `passport.ts` currently declares A1–A3 only on the PDF cover and explicitly excludes A4 in the disclaimer. This is a known bug and must be fixed before the PDF is shown.

---

## Competitors

| Tool | Gap |
|---|---|
| Tally (Revit plug-in) | Mid-stage, requires complete Revit model |
| One Click LCA | Late stage, after design is fixed |
| EC3 | Material database only, no geometry, no AI |

Early Carbon is the only tool at massing stage, with Rhino integration, live carbon number, AI suggestions, and transport impact.

---

## Business case

- Primary user: architects and architecture firms
- €40 per report, ~€2 to run → ~€38 margin
- Subscription for practices, volume packs for developers
- Named client: Maria, 12-person architecture practice, 4 hours saved per project
- Regulatory tailwind: EPBD recast — whole-life carbon mandatory EU-wide by 2030, large buildings from 2028

**Five payer rows:**
- Developer: Team / IAAC — build cost — working MVP
- Client: architecture practice — €40/report — carbon figure + suggestions + supplier matching
- User: architect — included in fee — 4 hours saved, defensible number
- Studio: IAAC / MaAI01 — academic output — validated research tool
- Platform: Claude/Gemini + Google Maps — ~€2/run — API fees

---

## Scalability

One engine, one adapter per region (national EPD database). Spain first, then Nordics (carbon limits already legislated), then DACH + France (INIES, OKOBAUDAT), then EPD International. EPBD recast is the regulatory forcing function across all of Europe.

---

## Presentation structure (professor's Friday instruction)

1. The regenerative question — open with it
2. The problem
3. The aim
4. Demo video
5. The project — context, case study (any building chosen for demo)
6. Tool screenshots
7. Why AI is useful for this
8. Business case — why different, why for architects
9. Return to the regenerative question — confirm it, show the number

---

## What is dropped / dead — do not resurface these

- The name SURROUND (for the tool — folder name only is still SURROUND)
- The 22@ Poblenou district as a case study
- The neighbourhood database (1,691 buildings, OSM pipeline)
- The 207 kg CO₂e/m² district average figure
- INDICATE-Spain data source
- Catastro España data source
- The correlation matrix / similarity score / neighbourhood scan logic
- The Engel House as a named case study
- Any specific named case study building — it is just "the demo building"

---

## Codebase structure (as audited 21 June 2026)

### SurroundPlugin/ — the main tool
- **C# Rhino plugin** (`SurroundPlugin.cs`, `Commands/`, `Core/`, `UI/`) — architect types `SurroundSync` in Rhino, geometry is classified by layer keyword, volumes computed, data POSTed to the Vite dev server
- **React/TypeScript frontend** (`Frontend/src/`) — receives Rhino data, shows Three.js viewer, calculates carbon, AI suggestions, supplier matching, PDF download
- **FastAPI backend** (`backend/main.py`) — serves `/v1/suggestions` (RAG + Claude), calls bhavana pipeline; must be running before the demo

Key frontend files:
- `Frontend/src/lib/materials.ts` — 21 materials, all BEDEC/ITeC coefficients verified
- `Frontend/src/lib/carbon.ts` — `totalCO2kg(els, transportKg=0)` — transport param exists but callers don't use it yet
- `Frontend/src/state/building.ts` — Zustand store; `transportCo2Kg` stored but not surfaced in totals
- `Frontend/src/lib/passport.ts` — jsPDF passport generator; multiple source citations wrong (see bugs below)
- `Frontend/src/components/carbon/sections/ResultsSection.tsx` — live total display; A4 missing
- `Frontend/src/components/carbon/sections/SupplierSection.tsx` — Google Maps + Distance Matrix; transport CO₂ calculated correctly and stored in Zustand
- `Frontend/src/components/carbon/sections/OptimizeSection.tsx` — AI suggestion panel; `country:"ES"` correct; fallback to local `suggestSwaps()` if backend unavailable
- `Frontend/vite.config.ts` — rhinoBridge middleware; correct BEDEC/ITeC coefficients in local fallback

### SURROUND_UPFRONT-CARBON-bhavana/ — EPD retrieval pipeline
- `pipeline/epd_api.py` — `search_epds(keyword, country="ES")`, `extract_gwp_from_api_record()`
- `pipeline/report.py` — standalone ReportLab PDF generator (has SURROUND branding bugs)
- `run_pipeline.py` — manual entry point (has dead 22@ Poblenou content)
- Used by: FastAPI backend imports `search_epds` and `extract_gwp_from_api_record`

### SURROUND_UPFRONT-CARBON-rashi/ — geometry processor
- `parse_obj.py` — classifies OBJ surfaces by layer name and normal, computes volumes
- Used by: FastAPI backend as fallback when Rhino element volumes come in as zero

### SURROUND_UPFRONT-CARBON-Rim/ — standalone visualisation
- PBR render of massing model + comparative PDF
- **Not connected to the web frontend** — must be run manually as a Python script
- Has dead 22@ Poblenou content throughout
- The Three.js viewer in `BuildingViewer.tsx` is what the architect actually sees in the browser

---

## Known bugs to fix before demo (priority order)

### BLOCKS DEMO
1. **Port mismatch** — `SurroundSync.cs` posts to `localhost:8080`; Vite runs on `5173`. Rhino sync will fail. Fix: update the port constant in `SurroundSync.cs` to match Vite's port.
2. **APIClient default URL** — `Core/APIClient.cs` line 22 points to `https://surround-api-production.up.railway.app` (remote, may be down). Needs localhost default for dev.
3. **Hardcoded Mapbox token in source** — `MapInfoSection.tsx` line 13: `const MAPBOX_TOKEN = "pk.eyJ1IjoibWFydHNpbW85..."`. Live token committed to git. If revoked, the map breaks. Move to `VITE_MAPBOX_TOKEN` env var immediately.

### VISIBLE GAPS (jury will notice)
4. **A4 transport not in running total** — `ResultsSection.tsx` and `Footer.tsx` call `totalCO2kg(elements)` without the `transportKg` argument. Supplier section correctly calculates and stores transport CO₂ in Zustand, but the displayed total never changes when a supplier is selected. Fix: pass `transportCo2Kg` from Zustand as second arg to `totalCO2kg()` in both files.
5. **A4 not in passport PDF** — `passport.ts` line 70 same issue. Also: cover declares `"EN 15978 • A1–A3"` (line 95), disclaimer says A4 is out of scope (line 432). Fix all three.
6. **passport.ts cites MaterialePyramiden** — lines 47, 155, 309, 412 all cite `materialepyramiden.dk` or "MaterialePyramiden EPD database". Should be "BEDEC/ITeC via 2050-materials API".
7. **Wrong coefficients in `routes/api/plugin/estimate.ts`** — foundation: 282 (correct 312), envelope: 297 (correct 432), roof: 5403 (correct 11461). Verify whether this file is on any live code path; if so, fix coefficients to match BEDEC/ITeC.
8. **AI suggestion backend unavailable warning** — requires `ANTHROPIC_API_KEY` in `backend/.env` and FastAPI running on port 8000 before demo. Without this, OptimizeSection shows yellow "Live EPD unavailable" banner.
9. **`SurroundCompare` command missing** — `UI/CarbonPanel.cs` line 66 calls `"SurroundCompare"` which has no corresponding command class. "Compare Scenarios" button in Rhino panel will error at runtime.

### INVISIBLE GAPS (won't be seen unless PDF is read closely)
10. **Danish category labels** — `materials.ts` `CATEGORY_LABELS`: "Træ/Biobaseret", "Mineralsk" — these render in passport PDF material breakdown.
11. **Benchmark inconsistency** — `passport.ts` uses 280 kg/m²; `bhavana/pipeline/comparative_table.py` uses 240. Decide one figure and apply it everywhere.
12. **bhavana PDF has SURROUND branding** — `pipeline/report.py` line 125: "SURROUND\nMaterial Carbon Passport", line 301: "Generated by Surround Carbon Pipeline". Fix if bhavana PDF will be shown.
13. **bhavana and Rim have dead 22@ Poblenou content** — `run_pipeline.py`, `Rim/run_visualisation.py`, `Rim/make_report.py`, `Rim/render_usermodel.py` all reference "22@ Poblenou Residential Block" and the dead 207 kg/m² figure.
14. **Page `<title>` stale** — `routes/index.tsx` title is "Embodied Carbon Tool — Barcelona Poble Nou".
15. **`Sidebar.tsx` status text** — line 64: "Run SurroundSync in Rhino" — old command name shown to architect.

---

## Environment variables required

| Variable | Used by | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | `backend/.env` | Claude claude-sonnet-4-6 for AI suggestions |
| `VITE_GOOGLE_MAPS_API_KEY` | `Frontend/.env` | Places Autocomplete + Distance Matrix |
| `VITE_MAPBOX_TOKEN` | `Frontend/.env` | Map display (currently hardcoded — must be moved) |
| `EPD_API_TOKEN` | `backend/.env` | 2050-materials API for BEDEC/ITeC data |

FastAPI must be started manually before the demo: `cd backend && uvicorn main:app --reload --port 8000`

---

## Hard rules — do not break these

- Do NOT use `country='AU'` anywhere — always `'ES'`
- API keys always come from environment variables — never hardcoded
- LLM model always `claude-sonnet-4-6`
- Transport factor always `0.062 kg CO₂e per tonne-km`
- Carbon source always declared as `'BEDEC/ITeC via 2050-materials API'`
- The existing local computation in `vite.config.ts` must be kept as a fallback — do not delete it
- Do not rename any C# command class names (SurroundSync, SurroundAnalyze, SurroundExport)
- Do not touch Rim unless all other integrations are complete and stable

---

## What still needs to be done (as of 21 June 2026)

| Task | Priority | Status |
|---|---|---|
| Choose demo building, run before/after carbon calculation | CRITICAL | Not started |
| Confirm CLT coefficient from BEDEC/ITeC (search "fusta contralaminada") | CRITICAL | Using −400 pending confirmation |
| Record demo video | CRITICAL | Not started |
| Fix port mismatch SurroundSync.cs → Vite | CRITICAL | Not done |
| Wire transportCo2Kg into ResultsSection, Footer, passport.ts | CRITICAL | Not done |
| Fix passport.ts source citations (MaterialePyramiden → BEDEC/ITeC) | HIGH | Not done |
| Fix passport.ts scope declaration (A1–A3 → A1–A4) | HIGH | Not done |
| Move Mapbox token to env var | HIGH | Not done |
| Fix wrong coefficients in routes/api/plugin/estimate.ts | HIGH | Not done |
| Add ANTHROPIC_API_KEY to backend/.env | HIGH | Check if present |
| Fix "Compare Scenarios" button (SurroundCompare missing) | MEDIUM | Not done |
| Fix Danish category labels in materials.ts CATEGORY_LABELS | MEDIUM | Not done |
| Fix dead 22@ Poblenou content in bhavana + Rim scripts | MEDIUM | Not done |
| Fix SURROUND branding in bhavana/pipeline/report.py | MEDIUM | Not done |
| Fix page title in routes/index.tsx | LOW | Not done |
| Outreach to one architecture firm for buyer contact | HIGH | Not started |

---

## AI suggestion UI — what is already built

`OptimizeSection.tsx` is fully functional. It is NOT missing — it exists and is wired. The CLAUDE.md task "Build AI suggestion UI panel" is complete. What remains is ensuring the backend is running so the live EPD path works rather than falling back to local suggestions.

---

## Files in this project

- `prd_Early carbon.md` — full product requirements document
- `CLAUDE.md` — this file

---

*Context file for Claude · Early Carbon · MaAI01 · IAAC Barcelona · June 2026*
