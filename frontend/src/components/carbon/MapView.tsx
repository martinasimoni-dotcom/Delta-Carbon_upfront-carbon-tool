import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { FeatureCollection, Polygon, MultiPolygon, Position } from "geojson";
import { useBuilding } from "@/state/building";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

async function loadStaticPlots(): Promise<FeatureCollection> {
  const res = await fetch("/barcelona-all-plots.geojson");
  return (await res.json()) as FeatureCollection;
}

const ZONE_FILTERS = [
  { key: "all", label: "All" },
  { key: "22@", label: "22@ Poblenou" },
  { key: "Esponceda", label: "Esponceda" },
  { key: "Diagonal Mar", label: "Diagonal Mar" },
] as const;

type ZoneKey = (typeof ZONE_FILTERS)[number]["key"];

function polygonRing(geom: Polygon | MultiPolygon): Position[] {
  return geom.type === "Polygon" ? geom.coordinates[0] : geom.coordinates[0][0];
}

function centroidOf(ring: Position[]): [number, number] {
  let lng = 0;
  let lat = 0;
  ring.forEach((c) => {
    lng += c[0];
    lat += c[1];
  });
  return [lng / ring.length, lat / ring.length];
}

export function MapView({ onPlotClick }: { onPlotClick: () => void }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const onPlotClickRef = useRef(onPlotClick);
  onPlotClickRef.current = onPlotClick;

  const setSelectedParcel = useBuilding((s) => s.setSelectedParcel);
  const setPlotCenter = useBuilding((s) => s.setPlotCenter);
  const searchLocation = useBuilding((s) => s.searchLocation);
  const buildingPlaced = useBuilding((s) => s.buildingPlaced);
  const selectedParcel = useBuilding((s) => s.selectedParcel);

  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [parcelsLoaded, setParcelsLoaded] = useState(false);
  const [parcelCount, setParcelCount] = useState(0);
  const [zoneCounts, setZoneCounts] = useState<Record<string, number>>({});
  const [activeZone, setActiveZone] = useState<ZoneKey>("all");
  const [minArea, setMinArea] = useState(0);
  const [minFloors, setMinFloors] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const buildingMetaRef = useRef<{ w: number; h: number; height: number; center: [number, number]; rotation: number } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [heightM, setHeightM] = useState(30);
  const [widthScale, setWidthScale] = useState(1);
  const [depthScale, setDepthScale] = useState(1);
  
  const baseDimsRef = useRef<{ w: number; h: number } | null>(null);
  const replacedBuildingIdRef = useRef<string | number | null>(null);

  function ringApproxAreaM2(ring: Position[]): number {
    // Equirectangular approximation, good enough for small plots
    if (ring.length < 4) return 0;
    const lat0 = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    const mPerDegLat = 111320;
    const mPerDegLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
    let a = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const x1 = ring[i][0] * mPerDegLng;
      const y1 = ring[i][1] * mPerDegLat;
      const x2 = ring[i + 1][0] * mPerDegLng;
      const y2 = ring[i + 1][1] * mPerDegLat;
      a += x1 * y2 - x2 * y1;
    }
    return Math.abs(a) / 2;
  }

  function writeBuildingFootprint(m: mapboxgl.Map, dragging: boolean) {
    const meta = buildingMetaRef.current;
    if (!meta) return;
    const [cLng, cLat] = meta.center;
    const { w, h, height, rotation: rot } = meta;
    // Rotate corners around center using local meter scaling so rotation looks correct on the map
    const mPerDegLat = 111320;
    const mPerDegLng = 111320 * Math.cos((cLat * Math.PI) / 180);
    const halfWm = (w * mPerDegLng) / 2;
    const halfHm = (h * mPerDegLat) / 2;
    const theta = (rot * Math.PI) / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const cornersM: [number, number][] = [
      [-halfWm, -halfHm],
      [halfWm, -halfHm],
      [halfWm, halfHm],
      [-halfWm, halfHm],
    ];
    const ring = cornersM.map(([x, y]) => {
      const xr = x * cos - y * sin;
      const yr = x * sin + y * cos;
      return [cLng + xr / mPerDegLng, cLat + yr / mPerDegLat] as [number, number];
    });
    ring.push(ring[0]);
    const data: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { height, base_height: 0 },
          geometry: { type: "Polygon", coordinates: [ring] },
        },
      ],
    };
    const src = m.getSource("demo-building") as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(data);
    if (m.getLayer("demo-building-3d")) {
      m.setPaintProperty("demo-building-3d", "fill-extrusion-color", dragging ? "#2C5F4C" : "#B85450");
      m.setPaintProperty("demo-building-3d", "fill-extrusion-opacity", dragging ? 0.7 : 0.9);
    }
  }

  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [2.1953, 41.3995],
      zoom: 15.5,
      pitch: 60,
      bearing: -20,
      antialias: true,
    });
    map.current = m;
    m.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

    m.on("load", async () => {
      // 3D buildings — insert BEFORE the first symbol/label layer so they render under labels
      const styleLayers = m.getStyle()?.layers ?? [];
      const labelLayerId = styleLayers.find(
        (layer) => layer.type === "symbol" && (layer.layout as { "text-field"?: unknown } | undefined)?.["text-field"],
      )?.id;

      m.addLayer(
        {
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 13,
          paint: {
            "fill-extrusion-color": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              "#2C5F4C",
              "#E0E0E0",
            ],
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              13,
              0,
              13.05,
              ["get", "height"],
            ],
            "fill-extrusion-base": [
              "interpolate",
              ["linear"],
              ["zoom"],
              13,
              0,
              13.05,
              ["get", "min_height"],
            ],
            "fill-extrusion-opacity": 0.85,
          },
        },
        labelLayerId,
      );

      // Click any existing 3D building to select it as a placement target
      m.on("click", "3d-buildings", (e) => {
        if (!e.features?.length) return;
        const feature = e.features[0];
        const fid = feature.id;
        if (fid === undefined || fid === null) return;

        // Clear previous selection highlight
        if (replacedBuildingIdRef.current !== null && replacedBuildingIdRef.current !== fid) {
          m.setFeatureState(
            { source: "composite", sourceLayer: "building", id: replacedBuildingIdRef.current },
            { selected: false, replaced: false },
          );
        }
        m.setFeatureState(
          { source: "composite", sourceLayer: "building", id: fid },
          { selected: true },
        );
        replacedBuildingIdRef.current = fid;

        // Extract footprint ring from the clicked building
        const geom = feature.geometry as Polygon | MultiPolygon;
        if (geom.type !== "Polygon" && geom.type !== "MultiPolygon") return;
        const ring = polygonRing(geom).map((c) => [c[0], c[1]] as [number, number]);
        const [cLng, cLat] = centroidOf(ring as Position[]);

        const props = feature.properties ?? {};
        const buildingHeight = Number(props.height) > 0 ? Number(props.height) : 20;

        // Update highlight polygon
        const highlightSrc = m.getSource("highlight-plot") as mapboxgl.GeoJSONSource | undefined;
        if (highlightSrc) {
          highlightSrc.setData({
            type: "FeatureCollection",
            features: [{
              type: "Feature",
              properties: {},
              geometry: { type: "Polygon", coordinates: [ring] },
            }],
          } as FeatureCollection);
        }

        setSelectedParcel({
          id: `mapbox-building-${fid}`,
          codi: `Building #${fid}`,
          referenciaCadastral: `Building #${fid}`,
          maxHeightM: buildingHeight,
          plotCoords: ring,
        });
        setPlotCenter({ lat: cLat, lon: cLng });

        if (m.getLayer("demo-building-3d")) m.removeLayer("demo-building-3d");
        if (m.getSource("demo-building")) m.removeSource("demo-building");

        m.flyTo({ center: [cLng, cLat], zoom: 17, pitch: 70, duration: 1200, essential: true });
        m.once("moveend", () => onPlotClickRef.current());
      });

      m.on("mouseenter", "3d-buildings", () => {
        m.getCanvas().style.cursor = "pointer";
      });
      m.on("mouseleave", "3d-buildings", () => {
        m.getCanvas().style.cursor = "";
      });

      // Highlighted plot fill + outline (driven by selected parcel id)
      m.addSource("highlight-plot", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] } as FeatureCollection,
      });
      m.addLayer({
        id: "highlight-plot-fill",
        type: "fill",
        source: "highlight-plot",
        paint: { "fill-color": "#2C5F4C", "fill-opacity": 0.25 },
      });
      m.addLayer({
        id: "highlight-plot-outline",
        type: "line",
        source: "highlight-plot",
        paint: { "line-color": "#2C5F4C", "line-width": 3 },
      });

      // Load static plots and render green dot markers for available ones
      const data = await loadStaticPlots().catch(
        () => ({ type: "FeatureCollection", features: [] }) as FeatureCollection,
      );
      const available = data.features.filter(
        (f) => f.properties?.status === "available",
      );
      const counts: Record<string, number> = {};
      for (const f of available) {
        const z = String(f.properties?.zone ?? "");
        for (const { key } of ZONE_FILTERS) {
          if (key === "all") continue;
          if (z.includes(key)) counts[key] = (counts[key] ?? 0) + 1;
        }
      }
      setZoneCounts(counts);
      setParcelCount(available.length);

      available.forEach((f) => {
        const geom = f.geometry as Polygon | MultiPolygon | undefined;
        if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) return;
        const ring = polygonRing(geom).map((c) => [c[0], c[1]] as [number, number]);
        if (ring.length < 3) return;
        const [cLng, cLat] = centroidOf(ring);
        const props = f.properties ?? {};
        const zone = String(props.zone ?? "");
        const label = String(props.ref ?? props.id ?? props.codi ?? "Plot");
        const areaM2 = typeof props.area_m2 === "number" ? props.area_m2 : 0;
        const maxHeight = typeof props.max_height_m === "number" ? props.max_height_m : 0;
        const floors = Math.floor(maxHeight / 3);

        const el = document.createElement("div");
        el.className = "plot-marker";
        el.dataset.zone = zone;
        el.dataset.area = String(areaM2);
        el.dataset.floors = String(floors);
        el.innerHTML = `<div class="marker-dot"></div><div class="marker-label">${label} · ${areaM2} m² · ${floors}f</div>`;
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          setSelectedParcel({
            id: String(props.id ?? label),
            codi: label,
            referenciaCadastral: String(props.ref ?? props.id ?? label),
            maxHeightM: maxHeight > 0 ? maxHeight : undefined,
            plotCoords: ring,
          });
          setPlotCenter({ lat: cLat, lon: cLng });
          m.flyTo({ center: [cLng, cLat], zoom: 17, pitch: 60, duration: 1200, essential: true });
          m.once("moveend", () => onPlotClickRef.current());
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([cLng, cLat])
          .addTo(m);
        markersRef.current.push(marker);
      });

      setParcelsLoaded(true);
    });

    return () => {
      markersRef.current.forEach((mk) => mk.remove());
      markersRef.current = [];
      m.remove();
      map.current = null;
    };
  }, [setSelectedParcel, setPlotCenter]);

  useEffect(() => {
    if (!map.current || !searchLocation) return;
    map.current.flyTo({
      center: [searchLocation.lon, searchLocation.lat],
      zoom: 17,
      pitch: 60,
      duration: 1500,
      essential: true,
    });
  }, [searchLocation]);

  useEffect(() => {
    markersRef.current.forEach((mk) => {
      const el = mk.getElement();
      const z = el.dataset.zone ?? "";
      const a = Number(el.dataset.area ?? 0);
      const fl = Number(el.dataset.floors ?? 0);
      const visible =
        (activeZone === "all" || z.includes(activeZone)) &&
        a >= minArea &&
        fl >= minFloors;
      el.style.display = visible ? "block" : "none";
    });
  }, [activeZone, minArea, minFloors, parcelsLoaded]);

  // Place / remove the demo building when buildingPlaced toggles
  useEffect(() => {
    const m = map.current;
    if (!m || !parcelsLoaded) return;
    const removeBuilding = () => {
      if (m.getLayer("demo-building-3d")) m.removeLayer("demo-building-3d");
      if (m.getSource("demo-building")) m.removeSource("demo-building");
      buildingMetaRef.current = null;
    };
    if (!buildingPlaced || !selectedParcel?.plotCoords?.length) {
      removeBuilding();
      return;
    }
    removeBuilding();
    const ring = selectedParcel.plotCoords;
    const [cLng, cLat] = centroidOf(ring as Position[]);
    const lngs = ring.map((c) => c[0]);
    const lats = ring.map((c) => c[1]);
    const w = (Math.max(...lngs) - Math.min(...lngs)) * 0.6;
    const h = (Math.max(...lats) - Math.min(...lats)) * 0.6;
    const height = selectedParcel.maxHeightM && selectedParcel.maxHeightM > 0 ? selectedParcel.maxHeightM : 30;
    setRotation(0);
    setHeightM(height);
    setWidthScale(1);
    setDepthScale(1);
    buildingMetaRef.current = { w, h, height, center: [cLng, cLat], rotation: 0 };
    baseDimsRef.current = { w, h };

    m.addSource("demo-building", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] } as FeatureCollection,
    });
    m.addLayer({
      id: "demo-building-3d",
      type: "fill-extrusion",
      source: "demo-building",
      paint: {
        "fill-extrusion-color": "#B85450",
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": ["get", "base_height"],
        "fill-extrusion-opacity": 0.9,
      },
    });
    writeBuildingFootprint(m, false);

    // Drag handlers
    const canvas = m.getCanvasContainer();
    let dragging = false;

    const onMove = (e: mapboxgl.MapMouseEvent) => {
      if (!buildingMetaRef.current) return;
      buildingMetaRef.current.center = [e.lngLat.lng, e.lngLat.lat];
      writeBuildingFootprint(m, true);
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      m.off("mousemove", onMove as never);

      canvas.style.cursor = "";
      m.dragPan.enable();
      writeBuildingFootprint(m, false);
      setIsDragging(false);
    };
    const onDown = (e: mapboxgl.MapMouseEvent) => {
      e.preventDefault();
      dragging = true;
      setIsDragging(true);
      canvas.style.cursor = "grabbing";
      m.dragPan.disable();
      m.on("mousemove", onMove as never);
      m.once("mouseup", onUp);
    };
    const onEnter = () => {
      if (!dragging) canvas.style.cursor = "grab";
    };
    const onLeave = () => {
      if (!dragging) canvas.style.cursor = "";
    };

    // Mark underlying Mapbox building as replaced (hidden) while ours sits on top
    if (replacedBuildingIdRef.current !== null) {
      m.setFeatureState(
        { source: "composite", sourceLayer: "building", id: replacedBuildingIdRef.current },
        { selected: false, replaced: true },
      );
    }

    m.on("mousedown", "demo-building-3d", onDown);
    m.on("mouseenter", "demo-building-3d", onEnter);
    m.on("mouseleave", "demo-building-3d", onLeave);

    return () => {
      m.off("mousedown", "demo-building-3d", onDown);
      m.off("mouseenter", "demo-building-3d", onEnter);
      m.off("mouseleave", "demo-building-3d", onLeave);
      m.off("mousemove", onMove as never);
      canvas.style.cursor = "";
      m.dragPan.enable();
    };
  }, [buildingPlaced, selectedParcel, parcelsLoaded]);

  // Re-render building footprint when rotation/height/scale change
  useEffect(() => {
    const m = map.current;
    if (!m || !buildingMetaRef.current || !baseDimsRef.current) return;
    buildingMetaRef.current.rotation = rotation;
    buildingMetaRef.current.height = heightM;
    buildingMetaRef.current.w = baseDimsRef.current.w * widthScale;
    buildingMetaRef.current.h = baseDimsRef.current.h * depthScale;
    writeBuildingFootprint(m, false);
  }, [rotation, heightM, widthScale, depthScale, buildingPlaced]);



  return (
    <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      {isDragging && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(44, 95, 76, 0.95)",
            color: "white",
            padding: "16px 24px",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            zIndex: 1000,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 24 }}>🖱️</span>
          Drag to position building · Release to place
        </div>
      )}

      {/* Building edit controls (visible when building placed) */}
      {buildingPlaced && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.97)",
            padding: "12px 16px",
            borderRadius: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            zIndex: 20,
            minWidth: 380,
          }}
        >
          <EditSlider
            icon="↕"
            label="Height"
            unit="m"
            min={3}
            max={200}
            step={1}
            value={Math.round(heightM)}
            onChange={setHeightM}
            onReset={() => {
              const h = selectedParcel?.maxHeightM && selectedParcel.maxHeightM > 0 ? selectedParcel.maxHeightM : 30;
              setHeightM(h);
            }}
          />
          <EditSlider
            icon="↔"
            label="Width"
            unit="%"
            min={20}
            max={200}
            step={5}
            value={Math.round(widthScale * 100)}
            onChange={(v) => setWidthScale(v / 100)}
            onReset={() => setWidthScale(1)}
          />
          <EditSlider
            icon="⇕"
            label="Depth"
            unit="%"
            min={20}
            max={200}
            step={5}
            value={Math.round(depthScale * 100)}
            onChange={(v) => setDepthScale(v / 100)}
            onReset={() => setDepthScale(1)}
          />
          <EditSlider
            icon="↻"
            label="Rotate"
            unit="°"
            min={-180}
            max={180}
            step={1}
            value={rotation}
            onChange={setRotation}
            onReset={() => setRotation(0)}
          />
        </div>
      )}


      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          background: "rgba(255,255,255,0.95)",
          padding: "6px 12px",
          borderRadius: 6,
          fontSize: 12,
          color: "#2C5F4C",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontWeight: 500,
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        {!parcelsLoaded ? (
          <>
            <span
              style={{
                width: 12,
                height: 12,
                border: "2px solid #2C5F4C",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                display: "inline-block",
              }}
            />
            Loading plots…
          </>
        ) : (
          <>{parcelCount} available plots in Barcelona</>
        )}
      </div>
      {parcelsLoaded && (
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 16,
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            zIndex: 10,
          }}
        >
          {ZONE_FILTERS.map(({ key, label }) => {
            const count =
              key === "all" ? parcelCount : (zoneCounts[key] ?? 0);
            const active = activeZone === key;
            return (
              <button
                key={key}
                onClick={() => setActiveZone(key)}
                style={{
                  background: active ? "#2C5F4C" : "rgba(255,255,255,0.95)",
                  color: active ? "white" : "#2C5F4C",
                  border: "1px solid #2C5F4C",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      )}
      {parcelsLoaded && (
        <div
          style={{
            position: "absolute",
            top: 92,
            left: 16,
            background: "rgba(255,255,255,0.97)",
            padding: "10px 12px",
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            zIndex: 10,
            minWidth: 240,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: "#2C5F4C" }}>
              <span>Min area</span>
              <span>{minArea.toLocaleString()} m²</span>
            </div>
            <input
              type="range"
              min={0}
              max={8100}
              step={100}
              value={minArea}
              onChange={(e) => setMinArea(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#2C5F4C" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: "#2C5F4C" }}>
              <span>Min floors</span>
              <span>{minFloors}</span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              step={1}
              value={minFloors}
              onChange={(e) => setMinFloors(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#2C5F4C" }}
            />
          </div>
          {(minArea > 0 || minFloors > 0) && (
            <button
              onClick={() => { setMinArea(0); setMinFloors(0); }}
              style={{
                background: "transparent",
                color: "#B85450",
                border: "1px solid #B85450",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                alignSelf: "flex-start",
              }}
            >
              Reset filters
            </button>
          )}
        </div>
      )}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .plot-marker {
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: transform 0.2s;
        }
        .plot-marker:hover { transform: scale(1.2); }
        .marker-dot {
          width: 12px;
          height: 12px;
          background: #2C5F4C;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .marker-label {
          font-size: 10px;
          font-weight: 600;
          color: #2C5F4C;
          background: white;
          padding: 2px 6px;
          border-radius: 4px;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
        }
        .plot-marker:hover .marker-label { opacity: 1; }
      `}</style>
    </div>
  );
}

function EditSlider({
  icon,
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  onReset,
}: {
  icon: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  onReset: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16, width: 18, textAlign: "center" }}>{icon}</span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#2C5F4C",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          width: 50,
        }}
      >
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: "#2C5F4C" }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#1A1A1A",
          fontVariantNumeric: "tabular-nums",
          minWidth: 52,
          textAlign: "right",
        }}
      >
        {value}{unit}
      </span>
      <button
        onClick={onReset}
        style={{
          background: "transparent",
          border: "1px solid #D0D0D0",
          borderRadius: 6,
          padding: "3px 8px",
          fontSize: 10,
          fontWeight: 600,
          color: "#2C5F4C",
          cursor: "pointer",
        }}
      >
        Reset
      </button>
    </div>
  );
}
