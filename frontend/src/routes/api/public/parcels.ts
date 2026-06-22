import { createFileRoute } from "@tanstack/react-router";

const BASE = "https://geoportal.barcelona.cat/geobcn/serveis/territori/parcelles";

export const Route = createFileRoute("/api/public/parcels")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        const x = url.searchParams.get("x");
        const y = url.searchParams.get("y");
        const radi = url.searchParams.get("radi") ?? "1000";

        let target: string;
        if (id) {
          target = `${BASE}/${encodeURIComponent(id)}?f=json&geometria=true`;
        } else if (x && y) {
          target =
            `${BASE}?x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}` +
            `&proj=EPSG:25831&out_proj=EPSG:4326&radi=${encodeURIComponent(radi)}` +
            `&geometria=true&f=json`;
        } else {
          return new Response(
            JSON.stringify({ error: "Provide ?id= or ?x=&y=" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        try {
          const res = await fetch(target, {
            headers: { Accept: "application/json" },
          });
          const text = await res.text();
          return new Response(text, {
            status: res.status,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=300",
            },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ error: "upstream_failed", message: String(e) }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
