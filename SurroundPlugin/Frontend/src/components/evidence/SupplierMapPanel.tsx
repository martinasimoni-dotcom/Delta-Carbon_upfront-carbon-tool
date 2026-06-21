import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useBuilding } from "@/state/building";

const TOKEN =
  "pk.eyJ1IjoibWFydHNpbW85IiwiYSI6ImNtcDQweDJveTAwdHoyeHA2NHo2dWFwbjEifQ.m6hBtHEzpTEF15rpy0QjfA";

// Default center: Spain
const DEFAULT_CENTER: [number, number] = [-3.7038, 40.4168];
const DEFAULT_ZOOM = 5.5;

export function SupplierMapPanel() {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const plotCenter = useBuilding((s) => s.plotCenter);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    mapboxgl.accessToken = TOKEN;

    const center: [number, number] = plotCenter
      ? [plotCenter.lon, plotCenter.lat]
      : DEFAULT_CENTER;
    const zoom = plotCenter ? 10 : DEFAULT_ZOOM;

    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/light-v11",
      center,
      zoom,
      attributionControl: false,
    });
    mapRef.current = map;

    if (plotCenter) {
      map.on("load", () => {
        addPin(map, [plotCenter.lon, plotCenter.lat], "#E05540", "Project site");
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [plotCenter]);

  return (
    <div className="relative">
      <div ref={ref} className="w-full h-[520px]" />
      <div className="absolute bottom-4 left-4 bg-white/95 border border-[#e8e8e4] rounded-[8px] p-3 text-[11px] space-y-1.5 backdrop-blur">
        <div className="font-medium text-[#1a1a1a] mb-1">
          Supplier locality · A4 transport
        </div>
        {plotCenter ? (
          <LegendRow color="#E05540" label="Project site" dist="" />
        ) : (
          <div className="text-[#6a6a66]">Set a site location to enable supplier matching</div>
        )}
      </div>
    </div>
  );
}

function LegendRow({ color, label, dist }: { color: string; label: string; dist: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full"
        style={{ background: color, border: "1.5px solid white", boxShadow: "0 0 0 1px #2b2b2b33" }}
      />
      <span className="text-[#1a1a1a]">{label}</span>
      {dist && <span className="text-[#6a6a66]">· {dist}</span>}
    </div>
  );
}

function addPin(map: mapboxgl.Map, coord: [number, number], color: string, label: string) {
  const el = document.createElement("div");
  el.style.width = "16px";
  el.style.height = "16px";
  el.style.borderRadius = "50%";
  el.style.background = color;
  el.style.border = "2px solid #ffffff";
  el.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.25)";
  new mapboxgl.Marker(el)
    .setLngLat(coord)
    .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(label))
    .addTo(map);
}
