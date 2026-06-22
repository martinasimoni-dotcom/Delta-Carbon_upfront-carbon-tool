import { createFileRoute } from "@tanstack/react-router";

const EPD: Record<string, { name: string; co2PerM3: number; materialId: string }> = {
  foundation: { name: "Concrete C30/37",  co2PerM3: 282,  materialId: "concrete-c30" },
  structure:  { name: "Concrete C30/37",  co2PerM3: 282,  materialId: "concrete-c30" },
  envelope:   { name: "Brick, red",        co2PerM3: 297,  materialId: "brick-red"    },
  floors:     { name: "Concrete C20/25",  co2PerM3: 215,  materialId: "concrete-c20" },
  roof:       { name: "Structural steel", co2PerM3: 5403, materialId: "steel-struct" },
  other:      { name: "Concrete C20/25",  co2PerM3: 215,  materialId: "concrete-c20" },
};

type CachedEstimate = {
  estimate: unknown;
  dims: { width: number; depth: number; height: number };
  elements: Array<{ id: string; volumeM3: number }>;
  updatedAt: number;
};

let cache: CachedEstimate | null = null;

export const Route = createFileRoute("/api/plugin/estimate")({
  server: {
    handlers: {
      GET: async () => {
        if (!cache) {
          return new Response(JSON.stringify({ ready: false }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ ready: true, ...cache }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },

      POST: async ({ request }) => {
        let body: {
          geometry?: { footprint_m2?: number; height_m?: number; floors?: number };
          elements?: Array<{ name?: string; type?: string; volume_m3?: number; material?: string | null }>;
        };
        try {
          body = await request.json() as typeof body;
        } catch {
          return new Response(JSON.stringify({ error: "invalid_json" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const geometry = body.geometry ?? {};
        const footprintM2 = geometry.footprint_m2 ?? 1;
        const heightM = geometry.height_m ?? 0;
        const inElements = body.elements ?? [];

        const breakdown = inElements.map((el) => {
          const type = (el.type ?? "other").toLowerCase();
          const epd = EPD[type] ?? EPD.other;
          const volumeM3 = el.volume_m3 ?? 0;
          return {
            element: el.name ?? type,
            material_inferred: el.material ?? epd.name,
            volume_m3: volumeM3,
            co2_kg: volumeM3 * epd.co2PerM3,
            _type: type,
            _materialId: epd.materialId,
          };
        });

        const totalKg = breakdown.reduce((s, b) => s + b.co2_kg, 0);

        const estimate = {
          baseline_carbon: {
            total_kg_co2e: totalKg,
            total_tonnes: totalKg / 1000,
            per_m2: footprintM2 > 0 ? totalKg / footprintM2 : 0,
            breakdown: breakdown.map(({ _type: _t, _materialId: _m, ...b }) => ({
              ...b,
              percentage: totalKg !== 0 ? Math.abs(b.co2_kg / totalKg) * 100 : 0,
            })),
          },
          metadata: {
            inference_method: "local_epd",
            accuracy_estimate: "±18%",
            neighbors_used: 0,
          },
        };

        const side = Math.sqrt(Math.max(footprintM2, 1));
        cache = {
          estimate,
          dims: { width: side, depth: side, height: heightM },
          elements: breakdown.map((b) => ({ id: b._type, volumeM3: b.volume_m3 })),
          updatedAt: Date.now(),
        };

        return new Response(JSON.stringify(estimate), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
