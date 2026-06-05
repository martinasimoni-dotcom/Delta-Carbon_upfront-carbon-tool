# SURROUND Rhino Plugin
## Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** June 2026  
**Team:** SURROUND — Bhavana Priya · Martina Simoni · Rashi Desadla · Rim Choufani  
**Status:** Draft  

---

## 1. Overview

### 1.1 Product Summary

SURROUND is a Rhino 7/8 plugin that provides real-time embodied carbon assessment directly inside the Rhino viewport. It reads building geometry from an open model, sends it to the SURROUND cloud API, and displays upfront carbon estimates (A1–A3) broken down by building element — without requiring a BIM model, LCA training, or third-party software.

### 1.2 Problem Statement

Architects make 70% of carbon-critical decisions during concept and massing phase — before detailed BIM models exist. Existing LCA tools (One Click LCA, Tally) require complete Revit models and specialist training, making them inaccessible at the stage where they matter most.

There is no tool that works **inside Rhino**, at **massing stage**, with **no LCA knowledge required**.

### 1.3 Solution

A standalone Rhino plugin (`.rhp`) that:

1. Reads geometry and location from the Rhino document
2. Extracts volumes per layer (Foundation, Structure, Envelope, Floors, Roof)
3. Sends parameters to the SURROUND API
4. Receives an inferred material profile + carbon estimate
5. Displays results in a docked panel inside Rhino
6. Allows material overrides and real-time CO₂ recalculation
7. Exports a Material Passport PDF

### 1.4 Target Users

| User | Context | Need |
|------|---------|------|
| Architect | Early-stage design in Rhino | Carbon feedback before committing to structural system |
| Urban Designer | Massing studies | Compare scenarios (concrete vs timber) |
| Developer | Feasibility studies | Carbon budget per m² before hiring consultants |

---

## 2. Goals & Success Metrics

### 2.1 Goals

- **G1:** Provide carbon estimate in under 2 seconds from "SurroundAnalyze" command
- **G2:** Work with any Rhino model organized by layers — no special setup required
- **G3:** Achieve ±18% accuracy vs detailed LCA (target: ±15% by Q3 2026)
- **G4:** Zero LCA training required to get a result
- **G5:** Installable in under 2 minutes (drag-and-drop `.rhp`)

### 2.2 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| API response time (p95) | < 1.5s | API monitoring |
| Carbon accuracy | ±18% mean error | Monthly validation vs EPDs |
| Plugin install success rate | > 95% | Crash/error logs |
| Time to first estimate | < 3 min from install | User testing |
| Material override latency | < 500ms | Client-side measurement |

---

## 3. Scope

### 3.1 In Scope (v1.0)

- Rhino 7 and Rhino 8 (Windows)
- Layer-based geometry extraction
- Location via Rhino EarthAnchorPoint
- Material inference via SURROUND API (correlation matrix)
- Docked panel UI (WPF)
- Material picker dialog
- Scenario comparison (baseline vs alternative)
- Material Passport PDF export
- Local EPD data cache (offline fallback)

### 3.2 Out of Scope (v1.0)

- Grasshopper integration
- Speckle connector
- Mac OS support
- Rhino 6 support
- IFC import/export
- A4–A5 carbon phases (transport + construction)
- Real-time vendor matching
- Multi-user / collaboration features
- BIM interoperability (Revit, ArchiCAD)

### 3.3 Future Scope (v2.0+)

- Mac OS support (Rhino for Mac)
- Grasshopper component library
- A4–C4 full lifecycle coverage
- Local material vendor matching (BEDEC integration)
- Multi-city database (Amsterdam, Copenhagen, Berlin)
- LEED/BREEAM report export

---

## 4. Architecture Pipeline

### 4.1 End-to-End Data Flow

```
RHINO CLIENT
│
│  1. User runs "SurroundAnalyze" command
│  2. GeometryAnalyzer extracts:
│     - Location (EarthAnchorPoint → lat/lon)
│     - Volumes per layer (m³)
│     - Building dimensions (footprint, height, floors)
│  3. APIClient serializes to JSON
│
├── HTTPS POST → api.surround.com/v1/carbon/estimate
│
CLOUD API (FastAPI)
│
│  4. API Gateway: Auth + rate limiting
│  5. Spatial query: PostGIS 500m radius scan
│  6. Similarity scoring: top-5 neighbor buildings
│  7. Material profile aggregation
│  8. Volume → carbon calculation (EPD coefficients)
│  9. JSON response
│
├── HTTPS Response → Rhino Plugin
│
RHINO CLIENT
│
│  10. CarbonPanel updates with results
│  11. User can override materials
│  12. Plugin recalculates locally (cached coefficients)
│  13. Optional: export Material Passport PDF
```

### 4.2 Plugin Component Architecture

```
SurroundPlugin/
├── SurroundPlugin.rhp              Entry point, plugin registration
│
├── Commands/
│   ├── SurroundAnalyze.cs          Main command: extract + send + display
│   ├── SurroundMaterials.cs        Open material picker dialog
│   └── SurroundExport.cs           Export Material Passport PDF
│
├── UI/
│   ├── CarbonPanel.cs              Docked WPF panel (right side)
│   ├── MaterialPicker.cs           Material selection dialog
│   └── ScenarioCompare.cs          Baseline vs alternative view
│
├── Core/
│   ├── GeometryAnalyzer.cs         Read Rhino layers, compute volumes
│   ├── APIClient.cs                HTTP calls to SURROUND API
│   ├── CarbonCalculator.cs         Local recalculation on material override
│   └── MaterialDatabase.cs         Cached EPD data (offline fallback)
│
└── Models/
    ├── BuildingData.cs             Input model (location + elements)
    ├── CarbonEstimate.cs           API response model
    └── MaterialProfile.cs          Material + EPD data structure
```

### 4.3 API Contract

**Endpoint:** `POST https://api.surround.com/v1/carbon/estimate`

**Request:**
```json
{
  "location": {
    "lat": 41.3997,
    "lon": 2.1888
  },
  "geometry": {
    "footprint_m2": 2500,
    "height_m": 75,
    "floors": 20,
    "total_volume_m3": 3275
  },
  "elements": [
    {
      "name": "Structure",
      "type": "structure",
      "volume_m3": 1200,
      "material": null
    }
  ],
  "use_type": "office"
}
```

**Response:**
```json
{
  "baseline_carbon": {
    "total_kg_co2e": 6780000,
    "total_tonnes": 6780,
    "per_m2": 452,
    "breakdown": [
      {
        "element": "Structure",
        "material_inferred": "Concrete C30/37",
        "volume_m3": 1200,
        "co2_kg": 338400,
        "percentage": 5.0
      }
    ]
  },
  "similar_buildings": [
    { "osm_id": "342", "similarity_score": 0.91, "distance_m": 85 }
  ],
  "material_profile": {
    "concrete": 0.45,
    "steel": 0.15,
    "timber": 0.08,
    "brick": 0.12,
    "glass": 0.10,
    "insulation": 0.10
  },
  "metadata": {
    "inference_method": "correlation_matrix",
    "accuracy_estimate": "±18%",
    "neighbors_used": 5
  }
}
```

### 4.4 Backend Stack

| Layer | Technology |
|-------|-----------|
| API Framework | FastAPI (Python 3.11) |
| Database | PostgreSQL 14 + PostGIS 3.3 |
| Spatial queries | ST_DWithin, ST_Distance (PostGIS) |
| Cache | Redis 7 (API responses, EPD coefficients) |
| Inference | Correlation matrix + similarity scoring |
| EPD Data | MaterialePyramiden (CINARK / Royal Danish Academy) |
| Deployment | Docker + AWS (EU-West region) |

### 4.5 Performance Targets

| Stage | Target Latency |
|-------|---------------|
| Rhino → API Gateway | ~50ms |
| Spatial query (PostGIS) | ~200ms |
| Similarity calculation | ~100ms |
| Material + carbon calc | ~100ms |
| API → Rhino | ~50ms |
| **Total (cold)** | **~500ms** |
| **Total (cache hit)** | **~180ms** |

---

## 5. Functional Requirements

### 5.1 Geometry Extraction

| ID | Requirement | Priority |
|----|-------------|----------|
| GEO-01 | Plugin reads all visible Rhino layers | P0 |
| GEO-02 | Computes Brep volume per layer (RhinoCommon VolumeMassProperties) | P0 |
| GEO-03 | Converts Rhino units to meters automatically | P0 |
| GEO-04 | Classifies layers by element type (Foundation, Structure, Envelope, Floors, Roof) based on layer name keywords | P0 |
| GEO-05 | Reads building location from Rhino EarthAnchorPoint | P0 |
| GEO-06 | Calculates footprint from bounding box XY projection | P0 |
| GEO-07 | Falls back to bounding box volume if Brep volume computation fails | P1 |
| GEO-08 | Ignores locked and hidden layers | P1 |
| GEO-09 | User can manually assign element type to a layer via right-click context menu | P1 |

**Layer classification keywords:**

| Element Type | Keywords detected |
|---|---|
| Foundation | `foundation`, `base`, `pile`, `footing` |
| Structure | `structure`, `column`, `beam`, `slab`, `core` |
| Envelope | `wall`, `facade`, `envelope`, `curtain`, `cladding` |
| Floors | `floor`, `deck`, `ceiling` |
| Roof | `roof`, `canopy` |
| Other | Everything else (included in total, not broken down) |

### 5.2 API Communication

| ID | Requirement | Priority |
|----|-------------|----------|
| API-01 | Plugin sends HTTPS POST to SURROUND API on command run | P0 |
| API-02 | Request includes location, geometry, element volumes, use_type | P0 |
| API-03 | API key stored in Windows Credential Manager (not plain text) | P0 |
| API-04 | Response parsed into CarbonEstimate model | P0 |
| API-05 | Timeout after 10 seconds, show error in panel | P0 |
| API-06 | Retry once on network failure before showing error | P1 |
| API-07 | Offline mode: use cached EPD coefficients for local calculation | P1 |

### 5.3 Carbon Panel UI

| ID | Requirement | Priority |
|----|-------------|----------|
| UI-01 | Panel docks to right side of Rhino window | P0 |
| UI-02 | Displays total CO₂e in tonnes | P0 |
| UI-03 | Displays CO₂e per m² | P0 |
| UI-04 | Displays breakdown by element (progress bars + %) | P0 |
| UI-05 | Shows inferred material per element | P0 |
| UI-06 | "Change Materials" button opens material picker | P0 |
| UI-07 | "Export Passport" button triggers PDF export | P0 |
| UI-08 | Loading state while waiting for API response | P0 |
| UI-09 | Error state with message if API fails | P0 |
| UI-10 | Panel persists between Rhino sessions | P1 |
| UI-11 | "Compare Scenarios" button shows baseline vs alternative | P1 |

### 5.4 Material Picker

| ID | Requirement | Priority |
|----|-------------|----------|
| MAT-01 | Dialog shows list of materials from EPD database | P0 |
| MAT-02 | Each material shows name, CO₂e/m³, and category (mineral / biobased / metal) | P0 |
| MAT-03 | User selects element (e.g. Structure) and assigns material | P0 |
| MAT-04 | Plugin recalculates CO₂ locally after material override | P0 |
| MAT-05 | Panel updates with new total and breakdown | P0 |
| MAT-06 | User can reset to inferred baseline | P1 |
| MAT-07 | Material picker shows carbon delta vs baseline (e.g. "-12.4%") | P1 |

### 5.5 PDF Export

| ID | Requirement | Priority |
|----|-------------|----------|
| EXP-01 | Generates Material Passport PDF on button click | P0 |
| EXP-02 | PDF includes: project name, location, date, total CO₂e, per m², breakdown table | P0 |
| EXP-03 | PDF includes: material profile (inferred + any overrides) | P0 |
| EXP-04 | PDF includes: Rhino viewport screenshot | P1 |
| EXP-05 | PDF includes: accuracy disclaimer (±18%) | P0 |
| EXP-06 | PDF saved to user-specified path | P0 |

---

## 6. Non-Functional Requirements

### 6.1 Performance

- API response: < 1.5s (p95)
- Local material override recalculation: < 500ms
- Plugin load time at Rhino startup: < 2s
- PDF export: < 5s

### 6.2 Compatibility

- Rhino 7 (Windows) — primary target
- Rhino 8 (Windows) — secondary target
- Windows 10 / Windows 11
- .NET Framework 4.8 or .NET 6+
- Minimum 4GB RAM, 500MB free disk (for EPD cache)

### 6.3 Reliability

- Plugin must not crash Rhino on failure — all exceptions caught and shown in panel
- API failure must not block Rhino workflow — graceful degradation to offline mode
- Saved projects must not break between plugin versions

### 6.4 Security

- API key stored in Windows Credential Manager
- All API calls over HTTPS/TLS 1.3
- No building geometry stored on server beyond the request lifetime
- User data (project name, location) not logged server-side

### 6.5 Installation

- Single `.rhp` file, drag-and-drop into Rhino viewport
- No admin rights required
- No external dependencies to install manually
- Plugin auto-updates on Rhino start (with user confirmation)

---

## 7. User Stories

### Core Flow

**US-01 — First Estimate**
> As an architect with a massing model in Rhino, I want to run one command and see the embodied carbon of my building in under 2 seconds, so I can understand the carbon impact without opening another tool.

**Acceptance Criteria:**
- `SurroundAnalyze` command available in Rhino command line
- Plugin reads visible layers automatically
- SURROUND panel opens with total CO₂e and breakdown
- Total time from command to result < 3 seconds

---

**US-02 — Material Override**
> As an architect exploring structural systems, I want to swap concrete for CLT in the Structure layer and immediately see the carbon reduction, so I can compare options during design.

**Acceptance Criteria:**
- "Change Materials" opens picker with all EPD materials
- Selecting CLT for Structure updates panel in < 500ms
- New total shows carbon delta vs baseline (e.g. "-12.4%")
- User can reset to inferred baseline at any time

---

**US-03 — Export Passport**
> As a developer presenting to a client, I want to export a PDF showing the building's embodied carbon breakdown, so I can document our early-stage carbon assessment.

**Acceptance Criteria:**
- "Export Passport" generates PDF in < 5 seconds
- PDF includes: location, date, total CO₂e, per m², breakdown by element, material profile, accuracy disclaimer
- PDF saved to user-chosen path

---

**US-04 — Location Awareness**
> As an architect, I want the plugin to automatically detect that my model is located in 22@ Barcelona and use the local building database for inference, so I don't have to manually input context.

**Acceptance Criteria:**
- Plugin reads EarthAnchorPoint from Rhino document
- If no EarthAnchorPoint set, prompts user to click location on map
- API returns results from correct geographic database

---

**US-05 — Offline Fallback**
> As an architect working without internet, I want the plugin to use cached material data so I can still get a rough estimate, so my workflow is not blocked.

**Acceptance Criteria:**
- Cached EPD coefficients stored locally (updated weekly)
- If API fails, plugin shows offline estimate with disclaimer
- Offline estimate based on user-assigned materials or defaults

---

## 8. UI Wireframe

### Carbon Panel (Docked Right)

```
╔══════════════════════════════╗
║  SURROUND  CARBON            ║
╠══════════════════════════════╣
║                              ║
║  📍 Carrer de Llull, 22@     ║
║  41.3997°N, 2.1888°E         ║
║                              ║
║  Office · 2,500 m² · 75m     ║
║  GFA: 15,000 m²              ║
║  ─────────────────────────   ║
║                              ║
║  6,780 t CO₂e                ║
║  452 kg / m²                 ║
║                              ║
║  ─────────────────────────   ║
║  BREAKDOWN                   ║
║                              ║
║  Foundation  ████░░░  25%    ║
║  Structure   █████░░  35%    ║
║    Concrete C30/37           ║
║  Envelope    ███░░░░  20%    ║
║  Floors      ██░░░░░  15%    ║
║  Roof        █░░░░░░   5%    ║
║                              ║
║  ─────────────────────────   ║
║  [ Change Materials...  ]    ║
║  [ Compare Scenarios    ]    ║
║  [ Export Passport      ]    ║
║                              ║
║  ⚠ ±18% accuracy estimate   ║
╚══════════════════════════════╝
```

### Material Picker Dialog

```
╔══════════════════════════════════════╗
║  SELECT MATERIAL — Structure         ║
╠══════════════════════════════════════╣
║                                      ║
║  Element: Structure  ▼               ║
║                                      ║
║  ┌──────────────────────────────┐    ║
║  │  Category: All  ▼            │    ║
║  └──────────────────────────────┘    ║
║                                      ║
║  ○ Concrete C30/37    +282 kg/m³     ║
║  ● CLT Timber         -664 kg/m³  ✓  ║
║  ○ Structural Steel  +5403 kg/m³     ║
║  ○ Brick              +297 kg/m³     ║
║  ○ Stone wool ins.     +93 kg/m³     ║
║                                      ║
║  Impact vs baseline:  -12.4% CO₂    ║
║                                      ║
║  [ Apply ]     [ Reset ]  [ Close ]  ║
╚══════════════════════════════════════╝
```

---

## 9. Inference Engine (API Logic)

### Similarity Scoring Formula

```
Similarity Score =
  Use Type Match     × 0.40
  Spatial Proximity  × 0.30
  Size Similarity    × 0.20
  Era Match          × 0.10
```

**Component calculations:**

| Component | Calculation |
|-----------|-------------|
| Use Type Match | 1.0 (same), 0.7 (related), 0.0 (different) |
| Spatial Proximity | `1 - (distance_m / 500)` |
| Size Similarity | `1 - abs(GFA_input - GFA_candidate) / GFA_input` |
| Era Match | 1.0 (same decade), 0.5 (adjacent decade), 0.0 (> 20 years) |

### Material Allocation Logic

Inferred material profiles are applied element-by-element using domain rules:

| Element | Primary Material | Secondary |
|---------|-----------------|-----------|
| Foundation | Concrete (90%) | Steel (10%) |
| Structure | Concrete or Steel (70-100%) | Timber if available |
| Envelope | Brick + Glass + Insulation | Varies by era |
| Floors | Concrete (80%) | Timber (20%) |
| Roof | Concrete or CLT | Insulation |

### EPD Carbon Coefficients (A1–A3)

| Material | kg CO₂e / m³ | Category |
|----------|-------------|----------|
| Concrete C30/37 | +282 | Mineral |
| Brick | +297 | Mineral |
| Structural Steel | +5,403 | Metal |
| Aluminium | +28,890 | Metal |
| CLT Timber | −664 | Biobased |
| Wood Fibre | −127 | Biobased |
| Straw | −127 | Biobased |
| Stone Wool Insulation | +93.3 | Mineral |
| Glass (double glazing) | +850 | Mineral |

Source: MaterialePyramiden, CINARK / Royal Danish Academy (materialepyramiden.dk)

---

## 10. Accuracy & Limitations

### Accuracy Statement

SURROUND provides early-stage estimates only. Current mean error: **±18%** vs buildings with verified EPDs. Target: **±15%** (Q3 2026).

| Building type | Typical error |
|--------------|---------------|
| Large office, recent construction | ±8% |
| Standard residential | ±12% |
| Mixed-use, post-2010 | ±15% |
| Renovated industrial | ±32% |

### Error Sources

| Source | Contribution |
|--------|-------------|
| Material inference (correlation matrix) | ±10% |
| Carbon coefficients (regional EPD variation) | ±5% |
| Construction practice variation | ±3% |

### Acceptable Use

| ✅ Use SURROUND for | ❌ Do not use for |
|---------------------|-----------------|
| Comparing structural scenarios | Final EPD submission |
| Setting early-stage carbon budgets | Procurement decisions |
| Identifying high-impact elements | LEED/BREEAM credit calculations |
| Client feasibility presentations | Building permit applications |

The PDF export must include the accuracy disclaimer on every document.

---

## 11. Development Roadmap

### Phase 1 — MVP (3 months)

- [ ] Visual Studio project setup (RhinoCommon SDK)
- [ ] GeometryAnalyzer: layer reading + volume extraction
- [ ] APIClient: HTTP POST + response parsing
- [ ] CarbonPanel: basic WPF docked panel (totals + breakdown)
- [ ] SurroundAnalyze command registered in Rhino
- [ ] Plugin packaging as `.rhp`
- [ ] Internal testing on 5 Rhino models

**Deliverable:** Working plugin, returns carbon estimate for any Rhino model with standard layers.

### Phase 2 — Material Interaction (3 months)

- [ ] MaterialPicker dialog (all EPD materials)
- [ ] Local recalculation on material override
- [ ] ScenarioCompare view (baseline vs alternative)
- [ ] PDF export (Material Passport)
- [ ] EarthAnchorPoint location detection
- [ ] Offline fallback (cached EPD coefficients)
- [ ] User testing with 3 architecture firms

**Deliverable:** Full interactive workflow. User can explore scenarios and export passport.

### Phase 3 — Polish & Deploy (2 months)

- [ ] Auto-update mechanism
- [ ] Error handling and graceful degradation
- [ ] Performance optimization (< 1.5s p95)
- [ ] Accuracy validation on 50 buildings with EPDs
- [ ] Public release on Food4Rhino (Rhino plugin marketplace)
- [ ] Documentation + install guide

**Deliverable:** Public release. Installable by any Rhino user in < 2 minutes.

---

## 12. Open Questions

| # | Question | Owner | Due |
|---|----------|-------|-----|
| 1 | Should we prompt the user for `use_type` (office/residential/mixed) or infer from Rhino metadata? | Product | Phase 1 |
| 2 | What happens if EarthAnchorPoint is not set? Show map picker or ask user to type address? | UX | Phase 1 |
| 3 | Should material overrides be saved per Rhino file (as user text on layers)? | Engineering | Phase 2 |
| 4 | Do we need user accounts for Phase 1, or is a single shared API key acceptable? | Product | Phase 1 |
| 5 | What is the PDF template design — should it match the SURROUND web interface? | Design | Phase 2 |
| 6 | Mac OS support timeline? Rhino for Mac uses different UI framework (Eto.Forms) | Engineering | Phase 3 |

---

## 13. Appendix

### A. Rhino Layer Naming Convention (Recommended)

For best results, users should organize their model with these layer names:

```
SURROUND_Foundation
SURROUND_Structure
SURROUND_Envelope
SURROUND_Floors
SURROUND_Roof
```

The plugin also detects layers using keyword matching (see section 5.1), so existing layer structures are supported without renaming.

### B. Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Plugin language | C# | Required by RhinoCommon SDK |
| UI framework | WPF | Native Windows, supports docked panels in Rhino |
| API communication | System.Net.Http (HttpClient) | Built-in .NET, no extra dependencies |
| JSON serialization | Newtonsoft.Json | Standard for .NET Rhino plugins |
| PDF generation | PdfSharp or iTextSharp | Lightweight, no license issues |
| Local cache | JSON file in AppData | Simple, no database dependency on client |

### C. References

- RhinoCommon SDK Documentation: developer.rhino3d.com
- MaterialePyramiden EPD Database: materialepyramiden.dk
- INDICATE-Spain Carbon Benchmarks: GBCE, 2024
- BEDEC/ITeC Catalan Material Database: itec.cat
- Architecture 2030 Embodied Carbon Target: architecture2030.org
- SURROUND Neighbourhood Database: 22@ Poblenou, Barcelona (1,691 buildings)
