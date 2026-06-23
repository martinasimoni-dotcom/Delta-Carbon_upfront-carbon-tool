"""
Delta Carbon — FastAPI Backend
Serves: /health, /v1/carbon/estimate, /v1/suggestions
Runs on: localhost:8000
"""

import json
import os
import sys
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

# ── Path setup ────────────────────────────────────────────────────────────────

_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(_ROOT / "pipeline" / "epd"))
sys.path.insert(0, str(_ROOT / "pipeline" / "geometry"))

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Delta Carbon Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── BEDEC/ITeC coefficients (A1–A3, kg CO₂e/m³) ──────────────────────────────
# Source: BEDEC/ITeC (Institut de Tecnologia de la Construcció de Catalunya)
# Last aligned: June 2026

BEDEC_COEFFICIENTS: dict[str, float] = {
    "concrete c30/37":        312,
    "concrete c20/25":        258,
    "structural steel":     11461,
    "galvanised steel":     15308,
    "brick, red":             432,
    "brick":                  432,
    "aerated concrete":       216,
    "stone wool insulation":   93,
    "clt":                   -400,
    "clt timber":            -400,
    "timber":                -420,
    "timber / plywood":      -420,
    "straw":                 -120,
    "straw panels":          -120,
    "osb":                   -390,
    "expanded cork":         -100,
    "reused brick":            10,
    "aluminium":            46605,
}

# Default material per element type
ELEMENT_DEFAULTS: dict[str, tuple[str, float]] = {
    "foundation": ("Concrete C30/37", 312),
    "structure":  ("Concrete C30/37", 312),
    "envelope":   ("Brick, red",      432),
    "floors":     ("Concrete C20/25", 258),
    "roof":       ("Structural steel", 11461),
    "other":      ("Concrete C20/25", 258),
}

# ── Request / Response schemas ────────────────────────────────────────────────

class Geometry(BaseModel):
    footprint_m2: float = 400.0
    height_m: float = 15.0
    floors: int = 5

class ElementIn(BaseModel):
    type: str
    name: str
    volume_m3: float
    material: Optional[str] = None

class Location(BaseModel):
    lat: float
    lon: float

class EstimateRequest(BaseModel):
    geometry: Geometry
    elements: list[ElementIn]
    location: Optional[Location] = None
    obj_data: Optional[str] = None

class SuggestionRequest(BaseModel):
    element_type: str
    current_material: str
    current_co2_kg: float
    volume_m3: float
    building_use: str = "residential"
    country: str = "ES"

class RenderElementIn(BaseModel):
    type: str
    material: str

class RenderRequest(BaseModel):
    option_name: str
    building_use: str = "Office"
    location: str = "Barcelona, Spain"
    elements: list[RenderElementIn]
    total_co2_kg: float

# ── Rashi geometry fallback ───────────────────────────────────────────────────

def _run_rashi_fallback(obj_text: str, footprint_m2: float) -> dict[str, float]:
    """
    Parse OBJ string with Rashi, classify surfaces, compute volumes.
    Returns a mapping of element type → volume_m3.
    """
    try:
        from massing_model.parser import parse_obj_string
        from surface_recogniser.classifier import classify_groups
        from geometry.calculator import compute_volume

        groups = parse_obj_string(obj_text)
        surface_types = classify_groups(groups)

        wall_vol = 0.0
        floor_vol = 0.0
        roof_vol = 0.0

        for name, group in groups.items():
            stype = surface_types.get(name, "other")
            vol = compute_volume(group, surface_type=stype)
            if stype == "wall":
                wall_vol += vol
            elif stype == "floor":
                floor_vol += vol
            elif stype == "roof":
                roof_vol += vol

        # Map Rashi surface types to Delta Carbon element types
        return {
            "foundation": footprint_m2 * 0.5,   # 0.5m assumed foundation depth
            "structure":  wall_vol * 0.5,         # 50% of wall volume = structure
            "envelope":   wall_vol * 0.5,         # 50% of wall volume = envelope
            "floors":     floor_vol,
            "roof":       roof_vol,
        }
    except Exception as exc:
        print(f"[rashi-fallback] Error: {exc}")
        return {}

# ── /health ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "Delta Carbon backend"}

# ── /v1/carbon/estimate ───────────────────────────────────────────────────────

@app.post("/v1/carbon/estimate")
def carbon_estimate(req: EstimateRequest):
    geo = req.geometry
    elements = req.elements
    gfa = geo.footprint_m2 * geo.floors if geo.floors > 0 else geo.footprint_m2

    # Rashi fallback: if any element has zero volume and OBJ data is present
    rashi_volumes: dict[str, float] = {}
    if req.obj_data and any(e.volume_m3 == 0 for e in elements):
        rashi_volumes = _run_rashi_fallback(req.obj_data, geo.footprint_m2)

    breakdown = []
    total_kg = 0.0

    for el in elements:
        etype = el.type.lower()
        mat_name, coeff = ELEMENT_DEFAULTS.get(etype, ("Concrete C20/25", 258))

        # Override coefficient if a specific material is provided
        if el.material:
            key = el.material.lower()
            coeff = BEDEC_COEFFICIENTS.get(key, coeff)
            mat_name = el.material

        # Use Rashi volume as fallback when provided volume is zero
        vol = el.volume_m3
        if vol == 0 and etype in rashi_volumes:
            vol = rashi_volumes[etype]

        co2_kg = vol * coeff
        total_kg += co2_kg

        breakdown.append({
            "element": el.name,
            "material": mat_name,
            "volume_m3": round(vol, 3),
            "co2_kg": round(co2_kg, 1),
            "co2_per_m3": coeff,
            "source": "BEDEC/ITeC",
            "_co2_kg_raw": co2_kg,  # used for percentage pass below
        })

    # Second pass: percentages
    for item in breakdown:
        item["percentage"] = round(abs(item["_co2_kg_raw"] / total_kg) * 100, 1) if total_kg != 0 else 0
        del item["_co2_kg_raw"]

    return {
        "baseline_carbon": {
            "total_kg_co2e": round(total_kg, 1),
            "total_tonnes": round(total_kg / 1000, 2),
            "per_m2": round(total_kg / gfa, 1) if gfa > 0 else 0,
            "a1_a3_kg": round(total_kg, 1),
            "a4_kg": 0,
            "breakdown": breakdown,
        },
        "metadata": {
            "scope": "A1-A3",
            "source": "BEDEC/ITeC via 2050-materials API",
            "accuracy_estimate": "±15%",
        },
    }

# ── /v1/suggestions ───────────────────────────────────────────────────────────

@app.post("/v1/suggestions")
def suggestions(req: SuggestionRequest):
    import anthropic

    # Step A — EPD retrieval (Bhavana pipeline)
    keyword_map: dict[str, list[str]] = {
        "foundation": ["concrete foundation", "reinforced concrete", "concrete C30"],
        "structure":  ["CLT cross laminated timber", "structural concrete", "structural steel"],
        "envelope":   ["timber cladding", "brick facade", "CLT panel", "rammed earth"],
        "floors":     ["CLT floor panel", "concrete slab", "timber floor"],
        "roof":       ["CLT roof", "green roof", "steel roof deck", "timber roof"],
    }
    keywords = keyword_map.get(req.element_type.lower(), [req.element_type])

    records_for_llm: list[dict] = []
    try:
        from epd_api import search_epds, extract_gwp_from_api_record

        seen: set[str] = set()
        all_records: list[dict] = []
        for kw in keywords:
            try:
                results = search_epds(keyword=kw, country="ES", max_results=5)
                all_records.extend(results)
            except Exception as exc:
                print(f"[epd-api] keyword '{kw}' failed: {exc}")

        for r in all_records:
            name = r.get("name", "")
            if name not in seen:
                seen.add(name)
                records_for_llm.append(r)
        records_for_llm = records_for_llm[:15]

        # Step B — Format for LLM
        def format_epd(product: dict) -> Optional[str]:
            gwp = extract_gwp_from_api_record(product)
            if gwp is None:
                return None
            return (
                f"Material: {product.get('name', 'Unknown')}\n"
                f"GWP A1-A3: {gwp} kg CO₂e / {product.get('declared_unit', 'kg')}\n"
                f"Category: {product.get('category', 'N/A')}\n"
                f"EPD source: {product.get('epd_program_operator', 'N/A')}\n"
                f"---"
            )

        formatted = [f for f in (format_epd(r) for r in records_for_llm) if f]
        epd_context = "\n".join(formatted) if formatted else "(No EPD records retrieved — use BEDEC/ITeC reference values)"

    except Exception as exc:
        print(f"[epd-api] pipeline unavailable: {exc}")
        epd_context = "(EPD API unavailable — use BEDEC/ITeC reference values for Spain)"
        records_for_llm = []

    # Step C — LLM call (Claude claude-sonnet-4-6)
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

    client = anthropic.Anthropic(api_key=api_key)

    element_label = req.element_type.title()
    prompt = f"""You are a carbon consultant helping an architect reduce embodied carbon at the massing stage.

BUILDING CONTEXT:
- Element: {req.element_type} ({element_label})
- Current material: {req.current_material}
- Volume: {req.volume_m3} m³
- Current A1-A3 carbon: {req.current_co2_kg} kg CO₂e ({req.current_co2_kg / req.volume_m3:.0f} kg CO₂e/m³)
- Building use: {req.building_use}
- Country: Spain
- Carbon source: BEDEC/ITeC via 2050-materials API

RETRIEVED EPD RECORDS (verified A1-A3 data from 2050-materials API, Spanish EPDs):
{epd_context}

TASK:
Return exactly 3 to 5 material alternatives ranked from lowest to highest embodied carbon.

For each alternative, return a JSON object with these exact fields:
- material_name: exact product name from the EPD records above (or BEDEC/ITeC reference if EPD unavailable)
- gwp_per_declared_unit: the GWP value as it appears in the EPD record
- declared_unit: the unit (kg, m², m³, etc.)
- co2_per_m3: GWP converted to kg CO₂e/m³
- co2_kg_total: co2_per_m3 × {req.volume_m3}
- delta_kg: co2_kg_total minus {req.current_co2_kg} (negative = carbon saving)
- delta_tonnes: delta_kg / 1000
- suitability_note: one sentence on structural/thermal/fire suitability for {req.element_type}
- epd_source: value from epd_program_operator field, or "BEDEC/ITeC" if using reference values
- conversion_note: how you converted from declared unit to per m³

Return ONLY a JSON array. No preamble, no explanation outside the JSON.
Only include materials present in the retrieved EPD records, or BEDEC/ITeC reference values if records are unavailable.
Do not invent carbon values not grounded in the records or BEDEC/ITeC.
If fewer than 3 records have valid GWP values, return however many are valid."""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text

    # Step D — Parse
    try:
        suggestions_list = json.loads(raw)
    except json.JSONDecodeError:
        clean = raw.strip().replace("```json", "").replace("```", "").strip()
        try:
            suggestions_list = json.loads(clean)
        except json.JSONDecodeError:
            raise HTTPException(status_code=502, detail=f"LLM returned non-JSON: {raw[:200]}")

    return {
        "suggestions": suggestions_list,
        "llm_model": "claude-sonnet-4-6",
        "retrieved_epds_count": len(records_for_llm),
        "source": "BEDEC/ITeC via 2050-materials API",
    }

# ── /v1/render ────────────────────────────────────────────────────────────────

@app.post("/v1/render")
def render(req: RenderRequest):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not set — render unavailable")

    import openai
    client = openai.OpenAI(api_key=api_key)

    materials_desc = ", ".join([f"{el.type}: {el.material}" for el in req.elements])
    is_regenerative = req.total_co2_kg < 0
    timber_note = "The building uses biogenic timber materials with a warm natural aesthetic. " if any(
        kw in materials_desc.lower() for kw in ("clt", "timber", "straw")
    ) else ""
    regen_note = "Regenerative carbon-positive building design. " if is_regenerative else ""

    prompt = (
        f"Photorealistic architectural exterior render of a modern {req.building_use.lower()} building in {req.location}. "
        f"Materials: {materials_desc}. "
        f"Style: professional architectural visualization, natural daylight, high quality, "
        f"clean background, contemporary design. "
        f"{timber_note}"
        f"{regen_note}"
        f"No people, no text, no watermarks."
    )

    response = client.images.generate(
        model="dall-e-3",
        prompt=prompt,
        size="1792x1024",
        quality="standard",
        n=1,
    )

    image_url = response.data[0].url
    return {"image_url": image_url, "prompt_used": prompt}
