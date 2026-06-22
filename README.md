# Early Carbon

Massing-stage upfront carbon assessment tool for architects. Import a Rhino model, assign materials, get AI-powered alternatives from the BEDEC/ITeC database, match suppliers, and download a carbon passport — all before any structural decision is locked in.

**Team:** Bhavana Priya · Martina Simoni · Rashi Desadla · Rim Choufani  
**Course:** MaAI01 — AI Application for Regenerative Design, IAAC Barcelona  
Carbon data source: **BEDEC/ITeC via 2050-materials API** (`country="ES"`)

---

## Folder structure

```
├── plugin/          Rhino C# plugin — type SurroundSync in Rhino to push geometry
├── frontend/        React + Vite web app — the architect-facing UI
├── backend/         FastAPI — AI material suggestions via RAG + Claude
├── pipeline/
│   ├── epd/         EPD retrieval pipeline (2050-materials API, BEDEC/ITeC)
│   ├── geometry/    OBJ geometry parser and volume calculator
│   └── visualisation/  Standalone PBR render and comparative report
├── .env.example     Documents all API keys required
└── README.md
```

---

## API keys required

| Variable | Folder | Purpose |
|---|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | `frontend/.env` | Places Autocomplete + Distance Matrix |
| `VITE_MAPBOX_TOKEN` | `frontend/.env` | Map display |
| `ANTHROPIC_API_KEY` | `backend/.env` | Claude claude-sonnet-4-6 for AI suggestions |
| `EPD_API_TOKEN` | `backend/.env` | 2050-materials API (BEDEC/ITeC) |

Copy `.env.example` values into the relevant subfolder `.env` files. **Never commit `.env` files.**

---

## Install and run

**Frontend**

```bash
cd frontend
npm install        # or: bun install
npm run dev        # starts on http://localhost:5173
```

**Backend**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Both must be running simultaneously for AI suggestions to work.

**Rhino plugin**

Open `SurroundPlugin.sln` in Visual Studio, build (x64 Debug), then drag-and-drop the generated `.rhp` from `plugin/bin/x64/Debug/` into Rhino. Type `SurroundSync` in the Rhino command line to push geometry.

---

## Scope

**In scope:** A1–A3 (manufacturing) + A4 (transport to site)  
**Out of scope:** A5, B stages, C stages, Stage D
