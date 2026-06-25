// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "http";

// Carbon coefficients source: BEDEC/ITeC (Institut de Tecnologia de la Construcció de Catalunya)
// Values: kg CO₂e/m³ at A1–A3. Fallback values — replaced by live EPD API at suggestion time.
// Last aligned: June 2026
const EPD: Record<string, { name: string; co2PerM3: number }> = {
  foundation: { name: "Concrete C30/37",  co2PerM3:   312 }, // BEDEC/ITeC: +312 kg CO₂e/m³
  structure:  { name: "Concrete C30/37",  co2PerM3:   312 }, // BEDEC/ITeC: +312 kg CO₂e/m³
  envelope:   { name: "Brick, red",       co2PerM3:   432 }, // BEDEC/ITeC: +432 kg CO₂e/m³
  floors:     { name: "Concrete C20/25",  co2PerM3:   258 }, // BEDEC/ITeC: +258 kg CO₂e/m³
  roof:       { name: "Structural steel", co2PerM3: 11461 }, // BEDEC/ITeC: +11,461 kg CO₂e/m³
  other:      { name: "Concrete C20/25",  co2PerM3:   258 }, // BEDEC/ITeC: +258 kg CO₂e/m³
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
let objCache: string | null = null;

// Holds the project name selected in the web app — polled by the Rhino plugin every 3 s
let projectCache: { projectName: string | null; projectId: string | null; location: string | null } = {
  projectName: null,
  projectId: null,
  location: null,
};

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

      // Project selection endpoint — Rhino plugin polls this every 3 s
      server.middlewares.use(
        "/api/plugin/project",
        (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const headers = {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          };
          if (req.method === "OPTIONS") { res.writeHead(204, headers); res.end(); return; }
          if (req.method === "GET") {
            res.writeHead(200, headers);
            res.end(JSON.stringify(projectCache));
            return;
          }
          // POST — web app calls this when user selects a project
          if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
            req.on("end", () => {
              try {
                const d = JSON.parse(body) as { projectName?: string; projectId?: string; location?: string };
                projectCache = {
                  projectName: d.projectName ?? null,
                  projectId:   d.projectId   ?? null,
                  location:    d.location    ?? null,
                };
                res.writeHead(200, headers); res.end(JSON.stringify({ ok: true }));
              } catch { res.writeHead(400, headers); res.end(JSON.stringify({ error: "invalid_json" })); }
            });
            return;
          }
          next();
        },
      );

      // OBJ model upload/fetch bridge
      server.middlewares.use(
        "/api/model",
        (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const objHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          };

          if (req.method === "OPTIONS") {
            res.writeHead(204, objHeaders); res.end(); return;
          }

          const url = req.url ?? "";

          if (req.method === "POST" && url === "/upload") {
            let body = "";
            req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
            req.on("end", () => {
              objCache = body;
              res.writeHead(200, { ...objHeaders, "Content-Type": "application/json" });
              res.end(JSON.stringify({ ok: true, bytes: body.length }));
            });
            return;
          }

          if (req.method === "GET" && url === "/current") {
            if (!objCache) {
              res.writeHead(404, { ...objHeaders, "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "no_model" }));
              return;
            }
            res.writeHead(200, { ...objHeaders, "Content-Type": "model/obj" });
            res.end(objCache);
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
            req.on("end", async () => {
              // Try FastAPI backend first
              try {
                const backendRes = await fetch("http://localhost:8000/v1/carbon/estimate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body,
                });
                const data = await backendRes.json();
                // Update local cache from FastAPI response so GET still works
                try {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const raw = JSON.parse(body) as any;
                  const geo = raw.geometry ?? {};
                  const side = Math.sqrt(Math.max(geo.footprint_m2 ?? 1, 1));
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const inEls: any[] = raw.elements ?? [];
                  cache = {
                    estimate: data,
                    dims:     { width: side, depth: side, height: geo.height_m ?? 0 },
                    elements: inEls.map((e) => ({ id: String(e.type ?? "other"), volumeM3: Number(e.volume_m3 ?? 0) })),
                    location: null, // never overwrite user's project location from Rhino payload
                    updatedAt: Date.now(),
                  };
                } catch { /* cache update is best-effort */ }
                res.writeHead(200, headers);
                res.end(JSON.stringify(data));
                return;
              } catch {
                // FastAPI unavailable — fall back to local computation
                console.warn("[rhino-bridge] FastAPI backend unavailable, using local fallback");
              }

              // Local fallback (kept in sync with BEDEC/ITeC coefficients)
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
                  metadata: { inference_method: "local_epd_fallback", accuracy_estimate: "±18%", source: "BEDEC/ITeC" },
                };

                const side = Math.sqrt(Math.max(footprintM2, 1));
                cache = {
                  estimate,
                  dims:     { width: side, depth: side, height: heightM },
                  elements: rows.map((r) => ({ id: r._type, volumeM3: r.volume_m3 })),
                  location: null, // never overwrite user's project location from Rhino payload
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

      // /v1/render — proxy to FastAPI (DALL-E 3; no local fallback)
      server.middlewares.use(
        "/v1/render",
        (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const headers = {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          };
          if (req.method === "OPTIONS") { res.writeHead(204, headers); res.end(); return; }
          if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
            req.on("end", async () => {
              try {
                const backendRes = await fetch("http://localhost:8000/v1/render", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body,
                });
                const data = await backendRes.json();
                res.writeHead(backendRes.ok ? 200 : backendRes.status, headers);
                res.end(JSON.stringify(data));
              } catch {
                res.writeHead(503, headers);
                res.end(JSON.stringify({ error: "backend_unavailable" }));
              }
            });
            return;
          }
          next();
        },
      );

      // /v1/suggestions — proxy to FastAPI (no local fallback; LLM call required)
      server.middlewares.use(
        "/v1/suggestions",
        (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const headers = {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          };

          if (req.method === "OPTIONS") { res.writeHead(204, headers); res.end(); return; }

          if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
            req.on("end", async () => {
              try {
                const backendRes = await fetch("http://localhost:8000/v1/suggestions", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body,
                });
                const data = await backendRes.json();
                res.writeHead(200, headers);
                res.end(JSON.stringify(data));
              } catch {
                res.writeHead(503, headers);
                res.end(JSON.stringify({ error: "backend_unavailable", suggestions: [] }));
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
