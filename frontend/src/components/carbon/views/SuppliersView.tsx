import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { useBuilding } from "@/state/building";
import { getMaterial } from "@/lib/materials";
import { MANUFACTURERS, type Manufacturer } from "@/lib/suppliers";

const TRANSPORT_FACTOR = 0.062;

function isValidCoord(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    isFinite(lat) &&
    isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    shift = 0; result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    coords.push([lng / 1e5, lat / 1e5]);
  }
  return coords;
}

async function getRoute(
  originLat: number, originLng: number,
  destLat: number, destLng: number,
  apiKey: string
): Promise<{ distanceKm: number; polyline: string } | null> {
  try {
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
        destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
      }),
    });
    const data = await response.json();
    if (!data.routes || data.routes.length === 0) return null;
    const route = data.routes[0];
    return {
      distanceKm: route.distanceMeters / 1000,
      polyline: route.polyline.encodedPolyline,
    };
  } catch {
    return null;
  }
}

type RouteResult = {
  distanceKm: number;
  co2Kg: number;
  weightTonnes: number;
  materialName: string;
  volumeM3: number;
  usedFallback: boolean;
  routeCoords: [number, number][] | null;
};

export function SuppliersView() {
  const searchLocation = useBuilding((s) => s.searchLocation);
  const elements = useBuilding((s) => s.elements);
  const setTransportCo2Kg = useBuilding((s) => s.setTransportCo2Kg);
  const setSupplierName = useBuilding((s) => s.setSupplierName);
  const updateCurrentProject = useBuilding((s) => s.updateCurrentProject);

  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>("");
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [saved, setSaved] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const rawLat = searchLocation?.lat ?? NaN;
  const rawLng = searchLocation?.lon ?? NaN;
  const projectCoords =
    searchLocation && isValidCoord(rawLat, rawLng)
      ? { lat: rawLat, lng: rawLng }
      : null;

  const locationName = searchLocation?.name ?? "";
  const isSpain =
    locationName.toLowerCase().includes("spain") ||
    locationName.toLowerCase().includes("españa") ||
    locationName.toLowerCase().includes("barcelona") ||
    locationName.toLowerCase().includes("madrid") ||
    locationName.toLowerCase().includes("valencia") ||
    locationName.toLowerCase().includes("sevilla");

  const relevantManufacturers = MANUFACTURERS.filter((m) =>
    isSpain ? m.regions.includes("ES") : m.regions.includes("EU")
  );

  const sortedManufacturers = useMemo(() => {
    if (!projectCoords) return relevantManufacturers;
    return [...relevantManufacturers].sort((a, b) => {
      const distA = haversineKm(projectCoords.lat, projectCoords.lng, a.coords.lat, a.coords.lng);
      const distB = haversineKm(projectCoords.lat, projectCoords.lng, b.coords.lat, b.coords.lng);
      return distA - distB;
    });
  }, [relevantManufacturers, projectCoords]);

  const selectedManufacturer: Manufacturer | null =
    sortedManufacturers.find((m) => m.id === selectedManufacturerId) ?? null;

  // Init map once
  useEffect(() => {
    const mbToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!mbToken || !mapContainerRef.current) return;
    if (mapRef.current) return;

    mapboxgl.accessToken = mbToken;
    const center: [number, number] = projectCoords
      ? [projectCoords.lng, projectCoords.lat]
      : [2.1734, 41.3851];

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center,
      zoom: 5,
      interactive: true,
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update pins and route whenever result or selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const update = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (map.getLayer("route")) map.removeLayer("route");
      if (map.getSource("route")) map.removeSource("route");

      // Green dot — project location (Point A)
      if (projectCoords && isValidCoord(projectCoords.lat, projectCoords.lng)) {
        const el = document.createElement("div");
        el.style.cssText =
          "width:14px;height:14px;border-radius:50%;background:#1a4731;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)";
        const m = new mapboxgl.Marker({ element: el })
          .setLngLat([projectCoords.lng, projectCoords.lat])
          .setPopup(new mapboxgl.Popup({ offset: 10 }).setText("Project location"))
          .addTo(map);
        markersRef.current.push(m);
      }

      // Red dot — selected manufacturer (Point B)
      if (selectedManufacturer) {
        const el = document.createElement("div");
        el.style.cssText =
          "width:14px;height:14px;border-radius:50%;background:#dc2626;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)";
        const m = new mapboxgl.Marker({ element: el })
          .setLngLat([selectedManufacturer.coords.lng, selectedManufacturer.coords.lat])
          .setPopup(new mapboxgl.Popup({ offset: 10 }).setText(selectedManufacturer.name))
          .addTo(map);
        markersRef.current.push(m);
      }

      // Route polyline
      if (result?.routeCoords && result.routeCoords.length > 1) {
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: result.routeCoords },
          },
        });
        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#1a4731", "line-width": 3, "line-opacity": 0.8 },
        });

        const lngs = result.routeCoords.map((c) => c[0]);
        const lats = result.routeCoords.map((c) => c[1]);
        map.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: 60, duration: 800 }
        );
      } else if (projectCoords && selectedManufacturer) {
        map.fitBounds(
          [
            [
              Math.min(projectCoords.lng, selectedManufacturer.coords.lng),
              Math.min(projectCoords.lat, selectedManufacturer.coords.lat),
            ],
            [
              Math.max(projectCoords.lng, selectedManufacturer.coords.lng),
              Math.max(projectCoords.lat, selectedManufacturer.coords.lat),
            ],
          ],
          { padding: 80, duration: 800 }
        );
      }
    };

    if (map.isStyleLoaded()) {
      update();
    } else {
      map.once("load", update);
    }
  }, [result, selectedManufacturer, projectCoords]);

  const handleCalculate = async () => {
    if (!projectCoords || !selectedManufacturer) return;
    setCalculating(true);
    setSaved(false);
    setResult(null);

    const matchingEl = elements.find((e) => e.materialId === selectedManufacturer.materialId);
    const targetEl = matchingEl ?? [...elements].sort((a, b) => b.volumeM3 - a.volumeM3)[0];
    const mat = getMaterial(targetEl.materialId);
    const weightTonnes = (targetEl.volumeM3 * mat.density) / 1000;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    let distanceKm: number;
    let routeCoords: [number, number][] | null = null;
    let usedFallback = false;

    if (apiKey) {
      const routeData = await getRoute(
        projectCoords.lat, projectCoords.lng,
        selectedManufacturer.coords.lat, selectedManufacturer.coords.lng,
        apiKey
      );
      if (routeData) {
        distanceKm = routeData.distanceKm;
        routeCoords = decodePolyline(routeData.polyline);
      } else {
        distanceKm = haversineKm(
          projectCoords.lat, projectCoords.lng,
          selectedManufacturer.coords.lat, selectedManufacturer.coords.lng
        );
        usedFallback = true;
      }
    } else {
      distanceKm = haversineKm(
        projectCoords.lat, projectCoords.lng,
        selectedManufacturer.coords.lat, selectedManufacturer.coords.lng
      );
      usedFallback = true;
    }

    const co2Kg = Math.round(distanceKm * weightTonnes * TRANSPORT_FACTOR);

    setResult({
      distanceKm: Math.round(distanceKm),
      co2Kg,
      weightTonnes: Math.round(weightTonnes * 10) / 10,
      materialName: mat.name,
      volumeM3: Math.round(targetEl.volumeM3),
      usedFallback,
      routeCoords,
    });
    setCalculating(false);
  };

  const handleSave = () => {
    if (!result || !selectedManufacturer) return;
    setTransportCo2Kg(result.co2Kg);
    setSupplierName(selectedManufacturer.name);
    updateCurrentProject();
    setSaved(true);
  };

  return (
    <div className="flex h-full min-h-0">

      {/* Left — map (70%) */}
      <div className="relative" style={{ width: "70%" }}>
        <div ref={mapContainerRef} className="absolute inset-0" />
        {!import.meta.env.VITE_MAPBOX_TOKEN && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F9FAFB]">
            <p className="text-[11px] text-[#9CA3AF]">Set VITE_MAPBOX_TOKEN to show map</p>
          </div>
        )}
      </div>

      {/* Right — steps (30%) */}
      <div
        className="border-l border-[#E5E7EB] overflow-y-auto p-5 space-y-5 flex-shrink-0"
        style={{ width: "30%" }}
      >

        {/* Step 1 — Project location */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280] mb-1.5">
            Step 1 — Project location (Point A)
          </p>
          <div className="flex items-center gap-2 border border-[#E5E7EB] rounded-sm px-3 py-2.5 bg-white">
            <div className="w-2.5 h-2.5 rounded-full bg-[#1a4731] shrink-0" />
            <span className="text-xs text-foreground truncate">
              {projectCoords
                ? locationName || "Location set"
                : "No location — go to Site tab"}
            </span>
          </div>
          {!projectCoords && (
            <p className="text-[10px] text-[#EAB308] mt-1">
              Set a site location in the Site tab to enable A4 calculations.
            </p>
          )}
        </div>

        {/* Step 2 — Select manufacturer */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280] mb-1.5">
            Step 2 — Select manufacturer (Point B)
          </p>
          <p className="text-[11px] text-[#9CA3AF] mb-2">
            Manufacturers are sorted from closest to farthest from your project location.
          </p>
          <select
            value={selectedManufacturerId}
            onChange={(e) => {
              setSelectedManufacturerId(e.target.value);
              setResult(null);
              setSaved(false);
            }}
            className="w-full border border-[#E5E7EB] rounded-sm px-3 py-2.5 text-xs bg-white text-foreground focus:outline-none focus:border-[#1a4731]"
          >
            <option value="">Select a manufacturer…</option>
            {sortedManufacturers.map((m) => {
              const approxKm = projectCoords
                ? Math.round(haversineKm(projectCoords.lat, projectCoords.lng, m.coords.lat, m.coords.lng))
                : null;
              return (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.material} — {m.location}
                  {approxKm !== null ? ` (~${approxKm.toLocaleString()} km)` : ""}
                </option>
              );
            })}
          </select>
        </div>

        {/* Step 3 — Calculate */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280] mb-1.5">
            Step 3 — Calculate route
          </p>
          <button
            onClick={handleCalculate}
            disabled={!projectCoords || !selectedManufacturerId || calculating}
            className="w-full py-2.5 text-xs font-semibold uppercase tracking-wider text-white rounded-sm disabled:opacity-40 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1a4731" }}
          >
            {calculating ? "Calculating…" : "Calculate Route →"}
          </button>
        </div>

        {/* Results */}
        {result && selectedManufacturer && (
          <div className="border border-[#E5E7EB] rounded-sm bg-white divide-y divide-[#F3F4F6]">
            {result.usedFallback && (
              <div className="px-3 py-2 bg-[#FFFBEB]">
                <p className="text-[10px] text-[#92400E]">
                  Road route not available — using straight-line distance
                </p>
              </div>
            )}
            <div className="px-3 py-3 space-y-2.5">
              {[
                ["MANUFACTURER", selectedManufacturer.name + ", " + selectedManufacturer.location],
                ["DISTANCE", result.distanceKm.toLocaleString() + " km" + (result.usedFallback ? " (straight line)" : " (road)")],
                ["MATERIAL", result.materialName],
                ["WEIGHT", result.weightTonnes.toLocaleString() + " t"],
                ["A4 CO₂", "+" + result.co2Kg.toLocaleString() + " kg CO₂e"],
                ["SOURCE", "0.062 kg CO₂e/tonne-km · " + (result.usedFallback ? "Haversine" : "Google Routes API")],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#9CA3AF]">{label}</p>
                  <p className={`text-xs font-medium mt-0.5 break-words ${label === "A4 CO₂" ? "text-[#1a4731]" : "text-foreground"}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div className="px-3 py-3">
              {saved ? (
                <p className="text-[11px] text-[#1a4731] font-medium">
                  ✓ A4 transport saved to project — total CO₂ updated
                </p>
              ) : (
                <button
                  onClick={handleSave}
                  className="w-full text-xs font-semibold uppercase tracking-wider text-[#1a4731] border border-[#1a4731] rounded-sm px-3 py-1.5 hover:bg-[#F0FDF4] transition-colors"
                >
                  Save to project
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
