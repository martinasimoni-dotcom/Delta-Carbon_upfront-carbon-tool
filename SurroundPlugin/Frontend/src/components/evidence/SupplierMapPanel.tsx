import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN =
  "pk.eyJ1IjoibWFydHNpbW85IiwiYSI6ImNtcDQweDJveTAwdHoyeHA2NHo2dWFwbjEifQ.m6hBtHEzpTEF15rpy0QjfA";

const SITE: [number, number] = [2.1968, 41.3985];
const CLT: [number, number] = [2.2, 41.75];
const BRICK: [number, number] = [2.19, 41.393];

export function SupplierMapPanel() {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [2.2, 41.55],
      zoom: 8.4,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on("load", () => {
      // Pins
      addPin(map, SITE, "#E05540", "Pilot site — 105 Pujades");
      addPin(map, CLT, "#1A9E75", "CLT supplier · 40 km · Vallès Occidental");
      addPin(map, BRICK, "#E8893A", "Reclaimed brick · 800 m · 22@ demolition");

      // 500 m radius around site (dashed teal)
      map.addSource("scan-radius", {
        type: "geojson",
        data: circle(SITE, 0.5, 96),
      });
      map.addLayer({
        id: "scan-radius-line",
        type: "line",
        source: "scan-radius",
        paint: {
          "line-color": "#5bbfaa",
          "line-width": 1.4,
          "line-dasharray": [3, 3],
        },
      });

      // Lines site -> suppliers
      map.addSource("link-clt", {
        type: "geojson",
        data: lineFeature([SITE, CLT]),
      });
      map.addLayer({
        id: "link-clt",
        type: "line",
        source: "link-clt",
        paint: { "line-color": "#1A9E75", "line-width": 1.6 },
      });
      map.addSource("link-brick", {
        type: "geojson",
        data: lineFeature([SITE, BRICK]),
      });
      map.addLayer({
        id: "link-brick",
        type: "line",
        source: "link-brick",
        paint: { "line-color": "#E8893A", "line-width": 1.6 },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative">
      <div ref={ref} className="w-full h-[520px]" />
      <div className="absolute bottom-4 left-4 bg-white/95 border border-[#e8e8e4] rounded-[8px] p-3 text-[11px] space-y-1.5 backdrop-blur">
        <div className="font-medium text-[#1a1a1a] mb-1">
          Supplier locality · A1–A3 transport
        </div>
        <LegendRow color="#E05540" label="Pilot site — 105 Pujades" dist="" />
        <LegendRow color="#1A9E75" label="CLT supplier" dist="40 km · Vallès Occ." />
        <LegendRow color="#E8893A" label="Reclaimed brick" dist="800 m · 22@" />
        <div className="flex items-center gap-2 pt-1 border-t border-[#e8e8e4] mt-1.5">
          <span
            className="inline-block w-4 h-0 border-t-2"
            style={{ borderColor: "#5bbfaa", borderStyle: "dashed" }}
          />
          <span className="text-[#6a6a66]">500 m neighbourhood scan</span>
        </div>
      </div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  dist,
}: {
  color: string;
  label: string;
  dist: string;
}) {
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

function addPin(
  map: mapboxgl.Map,
  coord: [number, number],
  color: string,
  label: string,
) {
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

function lineFeature(coords: [number, number][]): GeoJSON.Feature {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: coords },
  };
}

// Approximate circle in degrees from km radius
function circle(center: [number, number], km: number, steps = 64): GeoJSON.Feature {
  const [lng, lat] = center;
  const coords: [number, number][] = [];
  const earthR = 6371;
  const d = km / earthR;
  const latR = (lat * Math.PI) / 180;
  const lngR = (lng * Math.PI) / 180;
  for (let i = 0; i <= steps; i++) {
    const brng = (i / steps) * 2 * Math.PI;
    const lat2 = Math.asin(
      Math.sin(latR) * Math.cos(d) + Math.cos(latR) * Math.sin(d) * Math.cos(brng),
    );
    const lng2 =
      lngR +
      Math.atan2(
        Math.sin(brng) * Math.sin(d) * Math.cos(latR),
        Math.cos(d) - Math.sin(latR) * Math.sin(lat2),
      );
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}
