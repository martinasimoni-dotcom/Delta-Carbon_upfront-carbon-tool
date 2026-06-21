# Early Carbon — Product Requirements Document
## Final Presentation · IAAC Barcelona · 25 June 2026
**Team:** Bhavana Priya · Martina Simoni · Rashi Desadla · Rim Choufani
**Course:** MaAI01 · Group 10.2
**Upload deadline:** Wednesday 24 June, midnight

---

## 1. What Early Carbon is

Early Carbon is a Rhino-integrated upfront carbon assessment tool for architects at the earliest stage of design. The architect imports their massing model, assigns materials to building elements, receives AI-powered material suggestions grounded in verified EPD data, selects a supplier via a map picker, and gets a live carbon total that includes both manufacturing (A1–A3) and transport (A4) impact — before the design is fixed.

**The tool is global.** The engine runs on any massing, anywhere. The case study shown in the presentation is one demonstration building, the first of many.

---

## 2. The core claim

By activating biogenic materials (CLT, timber, straw), Early Carbon can produce a **negative upfront carbon total** — a building that stores more carbon in its materials than its construction emits. This is the regenerative outcome. It is not theoretical: CLT carries approximately −0.8 kg CO₂e/kg at A1–A3 (CINARK / Royal Danish Academy, verified EPD data). The tool makes this visible and actionable in the first hour of a project, when material decisions can still be changed.

---

## 3. The problem

- Buildings are responsible for 39% of global energy-related carbon emissions (Architecture 2030, RMI 2026)
- 11% of that is embodied carbon — emitted before the building is ever occupied, locked in forever
- By 2050, upfront carbon will account for 50% of all new construction's lifetime emissions (World Green Building Council, 2025)
- 70% of design decisions that influence a building's sustainability are made during the early design phase (Luo et al., Journal of Cleaner Production, 2025)
- Yet no tool gives architects a carbon figure at the massing stage, when it can still be changed
- Existing tools (Tally, EC3, One Click LCA) operate mid-to-late stage, after the structural and material logic is already set

**The gap:** carbon is decided in the first sketch, but measured only after the building is designed.

---

## 4. The aim

Give architects a verified carbon number — and a path to reduce it — in the first hour of design, at the massing stage, before any structural or material decision is locked in.

Scope: A1–A3 (manufacturing) + A4 (transport to site). End-of-life (C stages) is out of scope and must be stated proactively in the presentation.

---

## 5. The tool — how it works

### User flow

1. **Site** — search a city, address, or place. The project plot is geolocated. This coordinates everything downstream: regional material availability, supplier distance calculation, climate zone context.

2. **Import geometry** — the architect imports their Rhino model via the Early Carbon Rhino plugin. Building geometry is pulled automatically. No manual volume entry required.

3. **Building elements** — the tool breaks the model into elements: Foundation, Structure (columns/beams), Envelope (façade), Floors/slabs, Roof. Each element displays its current material and its CO₂ contribution in tonnes.

4. **Material assignment** — the architect assigns or reviews the material for each element from the library. The live CO₂ total updates immediately.

5. **AI material suggestions** — for any element, the architect can request alternatives. The RAG engine retrieves relevant entries from the embedded EPD + BEDEC/ITeC database and passes them to the LLM, which returns 3–5 alternatives ranked by carbon impact, each with: material name, kg CO₂e/m³, one-line suitability note, source tag (BEDEC/ITeC or EPD reference), and a delta figure (tonnes saved on this element). The architect clicks "Apply" and the total updates.

6. **Supplier matching** — the architect selects a supplier via a Google Maps autocomplete search bar. The tool calculates road distance from the supplier location to the project plot using the Google Maps Distance Matrix API. Distance × material weight × standard road freight emission factor (0.062 kg CO₂e per tonne-km) = A4 transport carbon. This is added to the A1–A3 total in real time.

7. **Output** — total upfront carbon in tonnes CO₂e (A1–A4), broken down by element. Downloadable report.

### The regenerative moment

When the architect swaps concrete and brick for CLT, timber cladding, and bio-based panels, the A1–A3 coefficients go negative. The tool prints a negative total. A building that stores more carbon than its construction emits. This is visible, live, in the interface.

---

## 6. The AI core — technical decisions

### Material suggestion: RAG (Retrieval-Augmented Generation)

**Why RAG and not a plain API call:** the LLM reasons over retrieved, verified EPD entries rather than generating carbon coefficients from training data. When the jury asks "where does that number come from," the answer is: "from BEDEC/ITeC and verified EPD data, retrieved at query time." The AI ranks and explains; the numbers come from the database.

**Pipeline:**
- Chunk and embed EPD database + BEDEC/ITeC data into a vector store. Each chunk = one material entry (name, kg CO₂e/kg, element suitability, unit, source)
- Query constructed from: element type + current material + volume + building use type + location
- Vector store retrieves top 10–15 relevant material entries
- Retrieved entries passed as context to LLM
- LLM returns top 3–5 suggestions with reasoning, delta figures, and source tags

**Vector store options:** Pinecone or Supabase with pgvector
**LLM:** Claude (claude-sonnet-4-6) or Gemini API

**What AI adds that a lookup table cannot:** it reasons across carbon coefficient + structural suitability for the specific element type + regional availability + compatibility with other chosen materials simultaneously, and explains the tradeoff in language an architect can act on and justify to a client.

### Supplier matching: map-based, distance-calculated

- Google Maps Places Autocomplete search bar for supplier selection
- Project plot coordinates come from Step 1 (SITE)
- Google Maps Distance Matrix API calculates road distance: supplier → project plot
- Transport CO₂ = distance (km) × material weight (tonnes) × 0.062 kg CO₂e/tonne-km
- A4 figure added to A1–A3 total in real time
- Tool is not tied to any specific country — any project location, any supplier, the logic works

**Known suppliers for demo (curated list, by material):**
- CLT: Egoin (Basque Country), Arboreal (Galicia), Hasslacher (Spain operations)
- Structural steel: Celsa Group (Barcelona)
- Concrete: Acciona, LafargeHolcim Spain

---

## 7. Carbon coefficients — key figures

| Material | kg CO₂e/kg (A1–A3) | Approx. density | kg CO₂e/m³ | Source |
|---|---|---|---|---|
| Concrete C30/37 | +0.13 | 2400 kg/m³ | +312 | BEDEC/ITeC |
| Structural steel | +1.46 | 7850 kg/m³ | +11,461 | BEDEC/ITeC |
| Brick (red) | +0.24 | 1800 kg/m³ | +432 | BEDEC/ITeC |
| CLT | −0.80 | 500 kg/m³ | −400 | CINARK / Royal Danish Academy |
| Timber / Plywood | −0.70 | 600 kg/m³ | −420 | CINARK |
| Straw panels | −1.00 | 120 kg/m³ | −120 | CINARK |

**Source note for presentation:** CINARK / Royal Danish Academy, materialepyramiden.dk, verified EPD data, endorsed by GlobalABC (UNEP). BEDEC/ITeC, Catalan construction materials database.

---

## 8. Data sources

| Source | What it provides | Access |
|---|---|---|
| BEDEC / ITeC | CO₂ coefficients per material (kg CO₂e/unit) | Free (15 queries/month) |
| EPD database (verified) | Environmental Product Declarations per material | Open / varies |
| CINARK / Royal Danish Academy | Construction Materials Pyramid, ~60 materials, A1–A3 | Free, materialepyramiden.dk |
| Google Maps Platform | Places Autocomplete, Distance Matrix API | Paid API |

---

## 9. Scope and constraints — what to state proactively

**In scope:** A1–A3 (raw material supply, transport to manufacturer, manufacturing) + A4 (transport to site)

**Out of scope — state this before the jury raises it:**
- A5 (construction/installation process)
- B stages (use, maintenance, repair, replacement)
- C stages (end of life: demolition, disposal, waste)
- Stage D (beyond building lifecycle: reuse, recovery, recycle)

**Other constraints to declare:**
- EPD coverage is thinner outside Western Europe
- The supplier database is curated (not exhaustive) at launch
- What you show on 25 June is a demonstration on one case, with the finished tool still ahead — state this clearly and treat it as a strength

---

## 10. Competitor landscape

| Tool | Stage | What it does | What it cannot do |
|---|---|---|---|
| Tally (Revit plug-in) | Mid-stage | Full LCA inside Revit | Requires complete Revit model; not early stage |
| One Click LCA | Late stage | Full LCA | Applied after design is fixed |
| EC3 | Any | Material carbon database | No design integration; no geometry; no AI suggestions |

**Early Carbon's position:** the only tool that operates at massing stage, connects directly to Rhino geometry, gives a live carbon figure before the design is fixed, and includes transport impact via real supplier location.

---

## 11. Business case

**Primary user:** architects and architecture firms at early design stage

**Pricing model:**
- Per-report: €40 per carbon assessment report
- Subscription: practices on monthly/annual plan
- Volume packs: developers (PDF output usable for permits and financing)

**Unit economics:**
- Cost per run: Claude/Gemini API call + compute + Google Maps API call ≈ ~€2
- Margin per report at €40: ~€38

**Named client example:** Maria, a 12-person architecture practice. 4 hours saved per project at early stage. €40 per report. The tool pays for itself in the first use.

**Regulatory tailwind:** EPBD recast makes whole-life carbon mandatory across the EU by 2030, large buildings from 2028. Early Carbon is positioned exactly at the compliance gap — the stage no other tool covers, the stage that becomes legally relevant first.

**Five payer rows (required by brief):**

| Role | Name / type | Price | What they get |
|---|---|---|---|
| Developer | Team / IAAC | Build cost | Working MVP |
| Client | Architecture practice (e.g. Maria) | €40/report or subscription | Carbon figure + material suggestions + supplier matching at massing stage |
| User | Architect | Included in client fee | 4 hours saved, defensible carbon number for permit/client |
| Studio | IAAC / MaAI01 | Academic output | Validated research tool |
| Platform | Claude / Gemini API + Google Maps | ~€2/run | API usage fees |

---

## 12. Scalability roadmap

**The engine runs on any massing, any city. Only the material database adapter changes per region.**

| | Year 1 | Year 3 | Year 5 |
|---|---|---|---|
| Geography | Spain | Spain + Nordics | DACH + France + EPD International |
| Database adapter | BEDEC/ITeC | + OKOBAUDAT (DE), INIES (FR) | + EPD International |
| Regulatory hook | EPBD preparation | EPBD large buildings mandatory (2028) | EPBD all buildings mandatory (2030) |
| What doesn't travel easily | Local EPD data sourcing | Local EPD verification standards | Language + regulatory nuance per country |
| Competitive moat | Every report grows the validated material matrix | Material data across regions | No later entrant can replicate the dataset |

---

## 13. The regenerative argument — full chain

This is the thread that opens and closes the presentation.

**The question:** can a building give back more carbon than it takes to build?

**The chain:**
1. Upfront carbon is locked in before occupation — it cannot be recovered operationally
2. At the massing stage, material decisions are still open — this is the only moment they can be changed
3. Biogenic materials (CLT, timber, straw) carry negative A1–A3 carbon coefficients — they store more CO₂ than they emit in manufacture
4. Early Carbon makes this visible, element by element, in the first hour of design
5. The AI suggests the path — from concrete to CLT, from brick to timber cladding
6. The supplier map makes it real and located — not a theoretical swap but an actual sourcing decision
7. The tool prints a negative total — a building that stores more carbon than its construction emits

**The answer:** yes. And here is the number.

---

## 14. Deliverables checklist

| Deliverable | Filename | Deadline |
|---|---|---|
| Presentation slides | SURROUND_01_Presentation.pdf + .pptx | Wed 24 June, midnight |
| Demo video | SURROUND_02_Demo.mp4 (1–3 min) | Wed 24 June, midnight |
| Tool folder | SURROUND_03_Tool (code + readme + data) | Wed 24 June, midnight |

**Note:** folder name remains SURROUND as set by the professor. Tool name in the presentation is Early Carbon.

**The number must be identical in:** slide Part 3, slide Part 5, demo video final frame, slide Part 10.

**The big idea sentence must be identical in:** Part 1 opening and Part 10 close.

---

## 15. What still needs to be done

| Task | Owner | Priority |
|---|---|---|
| Choose demo building and run before/after carbon calculation | Team | CRITICAL |
| Confirm CLT coefficient from BEDEC/ITeC (search "fusta contralaminada") | Team | CRITICAL |
| Build AI suggestion UI panel (mockup or functional) | Dev | CRITICAL |
| Build supplier map picker with distance calculation | Dev | HIGH |
| Record demo video on the chosen building | Team | CRITICAL |
| Outreach to one architecture firm for buyer contact | Team | HIGH |

---

*PRD authored for MaAI01 Final Presentation · IAAC Barcelona · Prof. Emanuele Naboni · June 2026*
