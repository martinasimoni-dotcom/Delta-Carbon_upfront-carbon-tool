# Early Carbon

> Massing-stage upfront carbon assessment tool for architects — import a Rhino model, assign materials, get AI-powered alternatives from the BEDEC/ITeC database, match suppliers, and download a carbon passport before any structural decision is locked in.

**Team:** Bhavana Priya · Martina Simoni · Rashi Desadla · Rim Choufani
**Course:** MaAI01 — AI Application for Regenerative Design, IAAC Barcelona
**Carbon data:** BEDEC/ITeC via 2050-materials API (`country="ES"`)

---

## What This Project Does

Early Carbon answers a single question for architects at the massing stage: *how much upfront carbon does this building emit, and what happens if I change the materials?* The tool accepts a Rhino massing model, classifies it into building elements (walls, floors, roof, envelope), calculates embodied carbon (A1–A3) from BEDEC/ITeC data, suggests lower-carbon alternatives via a RAG pipeline using Claude, adds transport emissions (A4) from a supplier distance lookup, and exports a carbon passport PDF. Because it runs at the massing stage — before structural and material decisions are fixed — it captures the only window where upfront carbon can meaningfully be reduced.

---

## How It Works

1. **Rhino plugin** — architect types `DeltaCarbonSync` in Rhino. The plugin classifies geometry by layer name, computes volumes, and POSTs them to the frontend.
2. **Frontend** — React/Vite app receives the model, shows a live 3D viewer, and calculates carbon per element using BEDEC/ITeC coefficients.
3. **AI suggestions** — architect clicks "Optimise" on any element. The frontend calls the FastAPI backend, which queries the 2050-materials API live (`country="ES"`), passes results to Claude (`claude-sonnet-4-6`), and returns 3–5 ranked alternatives with CO₂ delta figures.
4. **Supplier matching** — architect searches a supplier. Road distance is calculated via Google Maps Distance Matrix; transport CO₂ = distance × material weight × 0.062 kg CO₂e/t·km.
5. **Output** — total A1–A4 carbon in tonnes CO₂e, broken down by element. One-click PDF passport download.

---

## Project Structure

```
├── plugin/                  Rhino C# plugin (DeltaCarbonSync, DeltaCarbonSync commands)
│   ├── Commands/            Per-command C# files
│   ├── Core/                APIClient, CarbonCalculator, GeometryAnalyzer
│   └── UI/                  Docked Rhino panel
├── frontend/                React + Vite web app (architect-facing UI)
│   └── src/
│       ├── components/      Map, sidebar, carbon sections, 3D viewer
│       ├── lib/             materials.ts, carbon.ts, passport.ts
│       ├── state/           Zustand store (building.ts)
│       └── routes/          TanStack Router pages + API routes
├── backend/                 FastAPI — RAG pipeline + Claude AI suggestions
│   └── main.py              /v1/suggestions endpoint
├── pipeline/
│   ├── epd/                 EPD retrieval (2050-materials API, BEDEC/ITeC)
│   └── geometry/            OBJ parser and area/volume calculator
├── docs/                    Architecture diagrams
├── .env.example             Root env template (copy sections to subfolders)
├── frontend/.env.example    Frontend env template
├── backend/.env.example     Backend env template
└── README.md
```

---

## Prerequisites

| Requirement | Version |
|---|---|
| OS | Windows 10/11 64-bit |
| Rhino | 7 or 8 (Windows) |
| .NET SDK | 6.0+ |
| Node.js / Bun | Node 18+ or Bun 1.x |
| Python | 3.11+ |

> Mac is not supported. Rhino for Mac uses a different UI framework.

---

## Setup

### 1. Environment variables

```bash
# Frontend
cp frontend/.env.example frontend/.env
# Fill in VITE_GOOGLE_MAPS_API_KEY and VITE_MAPBOX_TOKEN

# Backend
cp backend/.env.example backend/.env
# Fill in ANTHROPIC_API_KEY and EPD_API_TOKEN
```

### 2. Frontend

```bash
cd frontend
npm install        # or: bun install
npm run dev        # starts on http://localhost:5173
```

### 3. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Both must be running simultaneously for AI suggestions to work.

### 4. Rhino plugin

```powershell
cd plugin
dotnet build -c Debug    # → bin/Debug/net48/DeltaCarbon.rhp
```

Drag `DeltaCarbon.rhp` onto the Rhino viewport. Type `DeltaCarbonSync` in the Rhino command line to push geometry to the web app.

---

## Environment Variables

| Variable | File | Purpose |
|---|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | `frontend/.env` | Places Autocomplete + Distance Matrix |
| `VITE_MAPBOX_TOKEN` | `frontend/.env` | Map tile display |
| `ANTHROPIC_API_KEY` | `backend/.env` | Claude for AI material suggestions |
| `EPD_API_TOKEN` | `backend/.env` | 2050-materials API (BEDEC/ITeC data) |

**Never commit `.env` files.** They are in `.gitignore`.

---

## Scope

**In scope:** A1–A3 (manufacturing + transport to factory gate) + A4 (transport to site)
**Out of scope:** A5, B stages, C stages, Stage D

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `react` + `@tanstack/react-start` | Frontend framework + SSR |
| `mapbox-gl` | Interactive map |
| `zustand` | Global state |
| `three` | 3D model viewer |
| `jspdf` | Carbon passport PDF export |
| `fastapi` + `uvicorn` | Backend API server |
| `anthropic` | Claude SDK for AI suggestions |
