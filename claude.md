# Claude Context — Early Carbon
## IAAC Barcelona · MaAI01 · Group 10.2
**Last updated:** 21 June 2026

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

5. **AI material suggestions** — architect requests alternatives for any element. RAG engine retrieves from embedded EPD + BEDEC/ITeC database, passes to LLM, returns 3–5 alternatives with: material name, kg CO₂e/m³, one-line suitability note, source tag, delta figure (tonnes saved). Architect clicks Apply, total updates.

6. **Supplier matching** — Google Maps autocomplete search bar. Tool calculates road distance from supplier to project plot via Google Maps Distance Matrix API. Transport CO₂ = distance × material weight × 0.062 kg CO₂e/tonne-km. Added to A1–A3 total in real time.

7. **Output** — total upfront carbon in tonnes CO₂e (A1–A4), broken down by element. Downloadable report.

---

## The AI architecture decision

**Material suggestions use RAG (Retrieval-Augmented Generation).** Not a plain API call, not a simple lookup table.

- BEDEC/ITeC + verified EPD data is chunked and embedded into a vector store (Pinecone or Supabase with pgvector)
- Each chunk = one material entry (name, kg CO₂e/kg, element suitability, unit, source)
- Query = element type + current material + volume + building use type + location
- Vector store retrieves top 10–15 entries
- LLM (Claude claude-sonnet-4-6 or Gemini) reasons over retrieved entries and returns ranked suggestions with reasoning

Why RAG: the LLM reasons over verified numbers, not training data. When asked "where does that number come from" the answer is "BEDEC/ITeC, retrieved at query time." The numbers come from the database; the AI ranks and explains.

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
| Structural steel | +1.46 | 7850 kg/m³ | +11,461 | BEDEC/ITeC |
| Brick (red) | +0.24 | 1800 kg/m³ | +432 | BEDEC/ITeC |
| CLT | −0.80 | 500 kg/m³ | −400 | CINARK / Royal Danish Academy |
| Timber / Plywood | −0.70 | 600 kg/m³ | −420 | CINARK |
| Straw panels | −1.00 | 120 kg/m³ | −120 | CINARK |

Key stats for the problem slide:
- 39% of global energy-related carbon emissions from buildings (Architecture 2030, RMI 2026)
- 11% is embodied carbon — locked in before occupation (Architecture 2030, RMI 2026)
- 50% of all new construction's lifetime emissions will be upfront carbon by 2050 (World Green Building Council, 2025)
- 70% of sustainability decisions made in early design phase (Luo et al., Journal of Cleaner Production, 2025)

---

## Data sources

| Source | What it provides |
|---|---|
| BEDEC / ITeC | CO₂ coefficients per material — search "fusta contralaminada" for CLT |
| CINARK / Royal Danish Academy | Construction Materials Pyramid, ~60 materials, materialepyramiden.dk |
| EPD database (verified) | Environmental Product Declarations |
| Google Maps Platform | Places Autocomplete + Distance Matrix API |

---

## Scope — what to declare proactively

**In scope:** A1–A3 + A4
**Out of scope (say this before the jury asks):** A5, B stages, C stages, Stage D

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

## What still needs to be done (as of 21 June 2026)

| Task | Priority |
|---|---|
| Choose demo building, run before/after carbon calculation | CRITICAL |
| Confirm CLT coefficient from BEDEC/ITeC | CRITICAL |
| Build AI suggestion UI panel (mockup or functional) | CRITICAL |
| Record demo video | CRITICAL |
| Build supplier map picker with distance calculation | HIGH |
| Outreach to one architecture firm for buyer contact | HIGH |

---

## Files in this project

- `prd.md` — full product requirements document
- `claude.md` — this file

---

*Context file for Claude · Early Carbon · MaAI01 · IAAC Barcelona · June 2026*
