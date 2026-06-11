// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "http";

// EPD carbon coefficients (A1–A3), matching materials.ts
const EPD: Record<string, { name: string; co2PerM3: number }> = {
  foundation: { name: "Concrete C30/37",  co2PerM3: 282  },
  structure:  { name: "Concrete C30/37",  co2PerM3: 282  },
  envelope:   { name: "Brick, red",        co2PerM3: 297  },
  floors:     { name: "Concrete C20/25",  co2PerM3: 215  },
  roof:       { name: "Structural steel", co2PerM3: 5403 },
  other:      { name: "Concrete C20/25",  co2PerM3: 215  },
};

type Cache = {
  estimate: unknown;
  dims: { width: number; depth: number; height: number };
  elements: Array<{ id: string; volumeM3: number }>;
  location: { lat: number; lon: number } | null;
  updatedAt: number;
};
let cache: Cache | null = null;
let plotCache: { lat: number; lon: number; id: string | number } | null = null;

// Vite middleware plugin — intercepts plugin requests before @cloudflare/vite-plugin
function rhinoBridge(): Plugin {
  return {
    name: "rhino-bridge",
    configureServer(server) {
      // Plot selection endpoint — Rhino plugin reads this to know where to place the building
      server.middlewares.use(
        "/api/plot/select",
        (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const headers = { "Content-Type": "application/json" };
          if (req.method === "OPTIONS") { res.writeHead(204, headers); res.end(); return; }
          if (req.method === "GET") {
            res.writeHead(200, headers);
            res.end(JSON.stringify(plotCache ? { ready: true, ...plotCache } : { ready: false }));
            return;
          }
          if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
            req.on("end", () => {
              try {
                const d = JSON.parse(body) as { lat?: number; lon?: number; id?: string | number };
                if (d.lat && d.lon) {
                  plotCache = { lat: d.lat, lon: d.lon, id: d.id ?? "unknown" };
                  res.writeHead(200, headers); res.end(JSON.stringify({ ok: true }));
                } else {
                  res.writeHead(400, headers); res.end(JSON.stringify({ error: "lat/lon required" }));
                }
              } catch { res.writeHead(400, headers); res.end(JSON.stringify({ error: "invalid_json" })); }
            });
            return;
          }
          next();
        },
      );

      server.middlewares.use(
        "/v1/carbon/estimate",
        (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const headers = {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
          };

          if (req.method === "OPTIONS") {
            res.writeHead(204, headers); res.end(); return;
          }

          if (req.method === "GET") {
            res.writeHead(200, headers);
            res.end(JSON.stringify(cache ? { ready: true, ...cache } : { ready: false }));
            return;
          }

          if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
            req.on("end", () => {
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const data = JSON.parse(body) as any;
                const geo = data.geometry ?? {};
                const footprintM2: number = geo.footprint_m2 ?? 1;
                const heightM: number     = geo.height_m     ?? 0;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const inEls: any[]        = data.elements    ?? [];

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rows = inEls.map((el: any) => {
                  const type   = String(el.type ?? "other").toLowerCase();
                  const epd    = EPD[type] ?? EPD.other;
                  const vol    = Number(el.volume_m3 ?? 0);
                  return { element: String(el.name ?? type), material_inferred: el.material ?? epd.name,
                           volume_m3: vol, co2_kg: vol * epd.co2PerM3, _type: type };
                });

                const totalKg = rows.reduce((s, r) => s + r.co2_kg, 0);
                const estimate = {
                  baseline_carbon: {
                    total_kg_co2e: totalKg,
                    total_tonnes:  totalKg / 1000,
                    per_m2:        footprintM2 > 0 ? totalKg / footprintM2 : 0,
                    breakdown: rows.map(({ _type: _, ...r }) => ({
                      ...r,
                      percentage: totalKg !== 0 ? Math.abs(r.co2_kg / totalKg) * 100 : 0,
                    })),
                  },
                  metadata: { inference_method: "local_epd", accuracy_estimate: "±18%", neighbors_used: 0 },
                };

                const side = Math.sqrt(Math.max(footprintM2, 1));
                const loc = data.location as { lat?: number; lon?: number } | undefined;
                cache = {
                  estimate,
                  dims:     { width: side, depth: side, height: heightM },
                  elements: rows.map((r) => ({ id: r._type, volumeM3: r.volume_m3 })),
                  location: (loc?.lat && loc?.lon) ? { lat: loc.lat, lon: loc.lon } : null,
                  updatedAt: Date.now(),
                };

                res.writeHead(200, headers);
                res.end(JSON.stringify(estimate));
              } catch {
                res.writeHead(400, headers);
                res.end(JSON.stringify({ error: "invalid_json" }));
              }
            });
            return;
          }

          next();
        },
      );
    },
  };
}

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [rhinoBridge()],
  },
});
