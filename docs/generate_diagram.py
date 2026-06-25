"""
Generates the Surround / Delta Carbon system architecture + data flow diagram.
Output: docs/architecture_diagram.png
Run: python docs/generate_diagram.py
"""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import matplotlib.patheffects as pe
import numpy as np

# ── Colour palette ────────────────────────────────────────────────────────────
C = {
    "navy":       "#1a3a5c",
    "teal":       "#2a7d6f",
    "green":      "#2e7d32",
    "amber":      "#e65100",
    "purple":     "#6a1b9a",
    "grey_dark":  "#37474f",
    "grey_light": "#eceff1",
    "blue_light": "#e3f2fd",
    "green_light":"#e8f5e9",
    "teal_light": "#e0f2f1",
    "amber_light":"#fff3e0",
    "purple_light":"#f3e5f5",
    "red_light":  "#fce4ec",
    "white":      "#ffffff",
    "arrow":      "#37474f",
    "jump":       "#e65100",
}

FIG_W, FIG_H = 22, 15
fig, ax = plt.subplots(figsize=(FIG_W, FIG_H))
ax.set_xlim(0, FIG_W)
ax.set_ylim(0, FIG_H)
ax.axis("off")
fig.patch.set_facecolor("#f8f9fa")
ax.set_facecolor("#f8f9fa")


# ── Helper: draw a labelled box ───────────────────────────────────────────────
def box(ax, x, y, w, h, title, body_lines=None, fill=C["white"],
        edge=C["navy"], title_bg=C["navy"], title_fg=C["white"],
        fontsize=7.5, title_size=8.5, radius=0.25):
    # Shadow
    ax.add_patch(FancyBboxPatch(
        (x + 0.07, y - 0.07), w, h,
        boxstyle=f"round,pad=0",
        linewidth=0, facecolor="#cccccc", zorder=1,
    ))
    # Body
    ax.add_patch(FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0",
        linewidth=1.2, edgecolor=edge, facecolor=fill, zorder=2,
    ))
    # Title bar
    ax.add_patch(FancyBboxPatch(
        (x, y + h - 0.55), w, 0.55,
        boxstyle="round,pad=0",
        linewidth=0, facecolor=title_bg, zorder=3,
    ))
    ax.text(x + w / 2, y + h - 0.27, title,
            ha="center", va="center", fontsize=title_size,
            fontweight="bold", color=title_fg, zorder=4)
    if body_lines:
        step = (h - 0.65) / (len(body_lines) + 0.5)
        for i, line in enumerate(body_lines):
            ax.text(x + 0.18, y + h - 0.7 - step * i,
                    line, ha="left", va="top", fontsize=fontsize,
                    color=C["grey_dark"], zorder=4, linespacing=1.3)


# ── Helper: straight arrow ─────────────────────────────────────────────────────
def arrow(ax, x0, y0, x1, y1, label="", color=C["arrow"],
          label_color=C["navy"], lw=1.3, zorder=5,
          style="->", label_offset=(0, 0.12)):
    ax.annotate("",
        xy=(x1, y1), xytext=(x0, y0),
        arrowprops=dict(
            arrowstyle=style, color=color, lw=lw,
            connectionstyle="arc3,rad=0",
        ),
        zorder=zorder,
    )
    if label:
        mx, my = (x0 + x1) / 2 + label_offset[0], (y0 + y1) / 2 + label_offset[1]
        ax.text(mx, my, label, ha="center", va="bottom",
                fontsize=6.5, color=label_color, fontweight="bold", zorder=zorder + 1,
                bbox=dict(fc="#f8f9fa", ec="none", pad=0.5))


# ── Helper: orthogonal (L-shaped) arrow ──────────────────────────────────────
def ortho_arrow(ax, x0, y0, x1, y1, via="h-then-v",
                label="", color=C["arrow"], label_color=C["navy"],
                lw=1.3, zorder=5):
    """Draw a right-angle arrow. via='h-then-v' goes horizontal first."""
    if via == "h-then-v":
        mid = (x1, y0)
    else:  # v-then-h
        mid = (x0, y1)
    ax.annotate("",
        xy=(x1, y1), xytext=(x0, y0),
        arrowprops=dict(
            arrowstyle="->", color=color, lw=lw,
            connectionstyle=f"angle,angleA=0,angleB=90",
        ),
        zorder=zorder,
    )
    if label:
        mx = (x0 + x1) / 2
        my = (y0 + y1) / 2
        ax.text(mx, my, label, ha="center", va="center",
                fontsize=6.5, color=label_color, fontweight="bold", zorder=zorder + 1,
                bbox=dict(fc="#f8f9fa", ec="none", pad=0.5))


# ── Helper: jump line (arc bridge over a crossing line) ───────────────────────
def jump_line(ax, x0, y0, x1, y1, jump_x, jump_radius=0.18,
              label="", color=C["arrow"], label_color=C["navy"], lw=1.3, zorder=6):
    """
    Draw a horizontal line from (x0,y0) to (x1,y1) with a jump arc
    at jump_x to hop over a crossing line.
    """
    # Segment 1: x0 → jump_x - radius
    ax.annotate("", xy=(jump_x - jump_radius, y0), xytext=(x0, y0),
        arrowprops=dict(arrowstyle="-", color=color, lw=lw), zorder=zorder)
    # Jump arc
    theta = np.linspace(np.pi, 0, 40)
    jx = jump_x + jump_radius * np.cos(theta)
    jy = y0 + jump_radius * np.sin(theta)
    ax.plot(jx, jy, color=color, lw=lw, zorder=zorder)
    # Segment 2: jump_x + radius → x1
    ax.annotate("", xy=(x1, y1), xytext=(jump_x + jump_radius, y0),
        arrowprops=dict(arrowstyle="->", color=color, lw=lw), zorder=zorder)
    if label:
        mx = (x0 + x1) / 2
        ax.text(mx, y0 + 0.14, label, ha="center", va="bottom",
                fontsize=6.5, color=label_color, fontweight="bold", zorder=zorder + 1,
                bbox=dict(fc="#f8f9fa", ec="none", pad=0.5))


# ══════════════════════════════════════════════════════════════════════════════
# TITLE
# ══════════════════════════════════════════════════════════════════════════════
ax.add_patch(FancyBboxPatch((0.3, 14.1), 21.4, 0.7,
    boxstyle="round,pad=0", linewidth=0, facecolor=C["navy"], zorder=2))
ax.text(11, 14.45, "DELTA CARBON  —  System Architecture & Data Flow",
        ha="center", va="center", fontsize=13, fontweight="bold",
        color="white", zorder=3)

# ══════════════════════════════════════════════════════════════════════════════
# SWIM LANE LABELS
# ══════════════════════════════════════════════════════════════════════════════
def lane_label(ax, y, label):
    ax.text(0.1, y, label, ha="left", va="center", fontsize=7,
            color="#90a4ae", fontstyle="italic", rotation=90)

lane_label(ax, 11.5, "INPUTS")
lane_label(ax, 7.8,  "CORE APPLICATION")
lane_label(ax, 3.5,  "PIPELINE MODULES")
lane_label(ax, 1.1,  "EXTERNAL APIs")

# Horizontal lane dividers
for y in [13.9, 9.5, 5.2, 2.0]:
    ax.axhline(y, color="#cfd8dc", lw=0.7, ls="--", zorder=0)

# ══════════════════════════════════════════════════════════════════════════════
# BOXES
# ══════════════════════════════════════════════════════════════════════════════

# ── INPUTS ───────────────────────────────────────────────────────────────────
box(ax, 0.5, 10.4, 3.2, 3.2,
    "RHINO 3D",
    ["DeltaCarbonSync C# plugin", "Classifies geometry", "by layer keyword",
     "Computes volumes", "POST to :5173"],
    fill=C["blue_light"], title_bg=C["navy"], edge=C["navy"])

box(ax, 5.0, 10.4, 3.2, 3.2,
    "OBJ FILE",
    [".obj massing model", "export from Rhino", "",
     "Input to geometry", "pipeline (Stage 2)"],
    fill=C["blue_light"], title_bg=C["grey_dark"], edge=C["grey_dark"])

# ── FRONTEND ─────────────────────────────────────────────────────────────────
box(ax, 0.5, 5.5, 4.2, 3.7,
    "FRONTEND  React/Vite  :5173",
    ["BuildingViewer (Three.js 3D)",
     "MapView (Mapbox)",
     "Zustand state",
     "  - elements[]  - materials",
     "  - transportCo2Kg",
     "Sections: Import, Elements,",
     "  Optimize, Supplier, Results",
     "Poll GET /v1/carbon/estimate (2s)"],
    fill=C["teal_light"], title_bg=C["teal"], edge=C["teal"])

# ── BACKEND ──────────────────────────────────────────────────────────────────
box(ax, 6.0, 5.5, 4.2, 3.7,
    "BACKEND  FastAPI  :8000",
    ["GET  /health",
     "POST /v1/carbon/estimate",
     "  BEDEC/ITeC coefficients",
     "  Rashi fallback (OBJ)",
     "POST /v1/suggestions",
     "  EPD retrieval (Bhavana)",
     "  Claude claude-sonnet-4-6 RAG",
     "  Returns JSON alternatives"],
    fill=C["blue_light"], title_bg=C["navy"], edge=C["navy"])

# ── PIPELINE / GEOMETRY ───────────────────────────────────────────────────────
box(ax, 0.5, 2.3, 3.8, 2.7,
    "pipeline/geometry  (Rashi)",
    ["parser.py  — parse_obj()",
     "classifier.py  — classify_groups()",
     "calculator.py  — compute_volume()",
     "json_export.py  — build_report()",
     "Output: surfaces + volumes .json"],
    fill=C["green_light"], title_bg=C["green"], edge=C["green"])

# ── PIPELINE / EPD ────────────────────────────────────────────────────────────
box(ax, 5.5, 2.3, 4.7, 2.7,
    "pipeline/epd  (Bhavana)",
    ["epd_api.py  — search_epds(country=ES)",
     "pdf_parser.py  — parse EPD PDFs",
     "unit_parser.py  — kg vs per-unit",
     "carbon_calc.py  — area x factor",
     "ranking.py  — top 5 geo + carbon",
     "comparative_table.py  — aggregate",
     "report.py  — PDF passport"],
    fill=C["green_light"], title_bg=C["green"], edge=C["green"])

# ── PIPELINE / VISUALISATION ─────────────────────────────────────────────────
box(ax, 11.8, 2.3, 3.8, 2.7,
    "pipeline/visualisation  (Rim)",
    ["select_materials.py",
     "texture_scraper.py",
     "add_texture.py / apply_texture.py",
     "gemini_render.py",
     "Output: rendered 3D model"],
    fill=C["purple_light"], title_bg=C["purple"], edge=C["purple"])

# ── EXTERNAL APIs ─────────────────────────────────────────────────────────────
box(ax, 11.8, 12.2, 3.8, 1.4,
    "Mapbox API",
    ["Map display", "VITE_MAPBOX_TOKEN"],
    fill=C["amber_light"], title_bg=C["amber"], edge=C["amber"], title_size=8)

box(ax, 11.8, 10.5, 3.8, 1.4,
    "Google Maps Places API",
    ["Supplier search autocomplete", "VITE_GOOGLE_MAPS_API_KEY"],
    fill=C["amber_light"], title_bg=C["amber"], edge=C["amber"], title_size=8)

box(ax, 11.8, 8.8, 3.8, 1.4,
    "Google Maps Distance Matrix",
    ["Supplier road distance (km)", "Transport CO2 = d x kg x 0.062"],
    fill=C["amber_light"], title_bg=C["amber"], edge=C["amber"], title_size=8)

box(ax, 11.8, 7.1, 3.8, 1.4,
    "Anthropic API  (Claude claude-sonnet-4-6)",
    ["RAG material suggestions", "ANTHROPIC_API_KEY"],
    fill=C["red_light"], title_bg="#c62828", edge="#c62828", title_size=8)

box(ax, 11.8, 5.4, 3.8, 1.4,
    "2050-materials API",
    ["BEDEC/ITeC EPD data", "country=ES  EPD_API_TOKEN"],
    fill=C["red_light"], title_bg="#c62828", edge="#c62828", title_size=8)

box(ax, 11.8, 0.2, 3.8, 1.4,
    "Gemini API",
    ["AI texture render", "(pipeline/visualisation only)"],
    fill=C["red_light"], title_bg="#c62828", edge="#c62828", title_size=8)

# ══════════════════════════════════════════════════════════════════════════════
# ARROWS — carefully routed to avoid crossings
# ══════════════════════════════════════════════════════════════════════════════

# [1] Rhino → Frontend (SurroundSync POST geometry)
arrow(ax, 3.7, 11.6, 0.5 + 4.2, 7.9,
      label="[1] POST geometry\n    SurroundSync",
      label_color=C["teal"], label_offset=(-0.6, 0.1),
      lw=1.5, color=C["teal"], zorder=6)

# [2] Frontend → Rhino (poll GET /v1/carbon/estimate every 2s)
arrow(ax, 4.7, 8.5, 3.7, 11.5,
      label="[2] poll GET /v1/carbon/\nestimate every 2s",
      label_color=C["teal"], label_offset=(0.8, 0),
      color=C["teal"], lw=1.0, zorder=6)

# [3] OBJ → pipeline/geometry (vertical drop)
arrow(ax, 6.6, 10.4, 6.6, 5.05,
      label="", color=C["grey_dark"], lw=1.3, zorder=5)
# then horizontal to geometry — but geometry is at x=0.5–4.3
# Route: drop to y=5.0, go left
arrow(ax, 6.6, 5.0, 4.3, 4.0,
      label="[3] .obj file\n   parse + classify",
      label_color=C["green"], label_offset=(-0.2, 0.12),
      color=C["grey_dark"], lw=1.3, zorder=5)

# [4] Frontend → Backend (POST /v1/carbon/estimate + /v1/suggestions)
arrow(ax, 4.7, 7.2, 6.0, 7.2,
      label="[4] POST /v1/carbon/estimate\n    POST /v1/suggestions",
      label_color=C["navy"], label_offset=(0, 0.12),
      color=C["navy"], lw=1.5, zorder=7)

# [5] Backend → Frontend (response)
arrow(ax, 6.0, 6.8, 4.7, 6.8,
      label="[5] carbon breakdown\n    + AI suggestions",
      label_color=C["navy"], label_offset=(0, -0.32),
      color=C["navy"], lw=1.0, zorder=7)

# [6] Backend → pipeline/geometry (Rashi fallback when volume=0)
arrow(ax, 6.0, 5.8, 4.3, 4.1,
      label="[6] Rashi fallback\n   (obj_data, vol=0)",
      label_color=C["green"], label_offset=(-0.2, 0.12),
      color=C["green"], lw=1.0, zorder=6)

# [7] pipeline/geometry → Backend (volumes JSON)
arrow(ax, 4.3, 3.5, 6.0, 6.0,
      label="[7] volumes.json",
      label_color=C["green"], label_offset=(0.5, 0),
      color=C["green"], lw=1.0, zorder=6)

# [8] Backend → pipeline/epd (search_epds call)
arrow(ax, 8.1, 5.5, 7.5, 5.0,
      label="[8] search_epds()\nextract_gwp()",
      label_color=C["green"], label_offset=(0.1, 0.12),
      color=C["green"], lw=1.3, zorder=6)

# [9] pipeline/epd → 2050-materials API
arrow(ax, 10.2, 3.7, 11.8, 6.1,
      label="[9] search keyword\ncountry=ES",
      label_color="#c62828", label_offset=(0.1, 0.1),
      color="#c62828", lw=1.3, zorder=6)

# [10] Backend → Anthropic API (Claude)
arrow(ax, 10.2, 7.1, 11.8, 7.6,
      label="[10] RAG prompt\n    + EPD context",
      label_color="#c62828", label_offset=(0.1, 0.12),
      color="#c62828", lw=1.3, zorder=7)

# [11] Frontend → Mapbox  (horizontal, top — no crossings)
arrow(ax, 4.7, 9.0, 11.8, 12.9,
      label="[11] VITE_MAPBOX_TOKEN",
      label_color=C["amber"], label_offset=(0, 0.12),
      color=C["amber"], lw=1.0, zorder=5)

# [12] Frontend → Google Maps Places
# This arrow crosses the Rhino→Frontend arrow and the OBJ line
# Route: go right along y=8.6, but there's a crossing at x≈6.0 (Frontend→Backend)
# Use a jump line over the Frontend→Backend horizontal
jump_line(ax, 4.7, 8.5, 11.8, 8.5,
          jump_x=5.95,
          jump_radius=0.18,
          label="[12] Places Autocomplete",
          color=C["amber"], label_color=C["amber"], lw=1.0, zorder=8)
# then vertical from x=11.8, y=8.5 → top of Google Places box
arrow(ax, 11.8 + 3.8 / 2, 8.5, 11.8 + 3.8 / 2, 10.5 + 1.4,
      label="", color=C["amber"], lw=1.0, zorder=5)

# [13] Frontend → Google Maps Distance Matrix
jump_line(ax, 4.7, 8.1, 11.8, 8.1,
          jump_x=5.95,
          jump_radius=0.18,
          label="[13] Distance Matrix",
          color=C["amber"], label_color=C["amber"], lw=1.0, zorder=8)
arrow(ax, 11.8 + 3.8 / 2, 8.1, 11.8 + 3.8 / 2, 8.8 + 1.4,
      label="", color=C["amber"], lw=1.0, zorder=5)

# [14] pipeline/visualisation → Gemini API
arrow(ax, 13.7, 2.3, 13.7, 1.6,
      label="[14] AI render",
      label_color="#c62828", label_offset=(0.5, 0),
      color="#c62828", lw=1.3, zorder=6)

# ══════════════════════════════════════════════════════════════════════════════
# LEGEND
# ══════════════════════════════════════════════════════════════════════════════
legend_x, legend_y = 0.5, 1.8
ax.text(legend_x, legend_y, "DATA FLOW KEY", fontsize=7, fontweight="bold",
        color=C["grey_dark"])
items = [
    (C["teal"],   "Rhino plugin ↔ Frontend"),
    (C["navy"],   "Frontend ↔ Backend (HTTP)"),
    (C["green"],  "Backend ↔ Pipeline modules"),
    (C["amber"],  "Frontend → External APIs"),
    ("#c62828",   "Backend/Pipeline → External APIs"),
    (C["jump"],   "╰ jump line = line crossing avoided"),
]
for i, (col, lbl) in enumerate(items):
    iy = legend_y - 0.28 - i * 0.28
    ax.plot([legend_x, legend_x + 0.4], [iy + 0.08, iy + 0.08],
            color=col, lw=2)
    ax.text(legend_x + 0.55, iy + 0.08, lbl, va="center",
            fontsize=6.5, color=C["grey_dark"])

# ══════════════════════════════════════════════════════════════════════════════
# SAVE
# ══════════════════════════════════════════════════════════════════════════════
import os
out_dir = os.path.join(os.path.dirname(__file__))
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "architecture_diagram.png")
plt.savefig(out_path, dpi=150, bbox_inches="tight",
            facecolor=fig.get_facecolor())
print(f"Saved: {out_path}")
plt.close()
