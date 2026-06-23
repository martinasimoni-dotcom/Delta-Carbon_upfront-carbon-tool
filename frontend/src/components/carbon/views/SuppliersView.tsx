import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { useBuilding } from "@/state/building";
import { getMaterial } from "@/lib/materials";
import { SUPPLIERS, type Supplier } from "@/lib/suppliers";

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

export function SuppliersView() {
  // Use searchLocation (real geographic location from Google Maps) — NOT plotCenter
  // plotCenter can carry invalid Rhino EarthAnchorPoint values like -1.234e+308
  const searchLocation = useBuilding((s) => s.searchLocation);
  const elements = useBuilding((s) => s.elements);
  const setTransportCo2Kg = useBuilding((s) => s.setTransportCo2Kg);
  const setSupplierName = useBuilding((s) => s.setSupplierName);
  const updateCurrentProject = useBuilding((s) => s.updateCurrentProject);

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { km: number; co2Kg: number }>>({});

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Derive validated project coordinates from searchLocation only
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

  const relevantSuppliers = SUPPLIERS.filter((s) =>
    isSpain ? s.regions.includes("ES") : s.regions.includes("EU")
  );

  const handleCalculate = (supplier: Supplier) => {
    if (!projectCoords) return;
    const km = Math.round(
      haversineKm(projectCoords.lat, projectCoords.lng, supplier.coords.lat, supplier.coords.lng)
    );
    const heaviest = [...elements].sort((a, b) => b.volumeM3 - a.volumeM3)[0];
    const mat = getMaterial(heaviest.materialId);
    const weightTonnes = (heaviest.volumeM3 * mat.density) / 1000;
    const co2Kg = Math.round(km * weightTonnes * TRANSPORT_FACTOR);
    setResults((prev) => ({ ...prev, [supplier.id]: { km, co2Kg } }));
    setSelectedSupplierId(supplier.id);
    setTransportCo2Kg(co2Kg);
    setSupplierName(supplier.name);
    updateCurrentProject();
  };

  // Mapbox — depends on projectCoords and selectedSupplierId only
  useEffect(() => {
    const mbToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!mbToken || !mapContainerRef.current) return;

    // Destroy any previous map to avoid WebGL context leaks
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    mapboxgl.accessToken = mbToken;
    const center: [number, number] = projectCoords
      ? [projectCoords.lng, projectCoords.lat]
      : [2.1734, 41.3851]; // fallback: Barcelona

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center,
      zoom: 4,
      interactive: false,
    });
    mapRef.current = map;

    map.on("load", () => {
      // Project pin — only when coordinates are valid
      if (projectCoords && isValidCoord(projectCoords.lat, projectCoords.lng)) {
        new mapboxgl.Marker({ color: "#1a4731" })
          .setLngLat([projectCoords.lng, projectCoords.lat])
          .setPopup(new mapboxgl.Popup().setText("Project"))
          .addTo(map);
      }

      // Supplier pins
      relevantSuppliers.forEach((s) => {
        const isSelected = s.id === selectedSupplierId;
        new mapboxgl.Marker({ color: isSelected ? "#1a4731" : "#9CA3AF" })
          .setLngLat([s.coords.lng, s.coords.lat])
          .setPopup(new mapboxgl.Popup().setText(s.name))
          .addTo(map);
      });

      // Dashed route line to selected supplier
      const selected = relevantSuppliers.find((s) => s.id === selectedSupplierId);
      if (selected && projectCoords && isValidCoord(projectCoords.lat, projectCoords.lng)) {
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [projectCoords.lng, projectCoords.lat],
                [selected.coords.lng, selected.coords.lat],
              ],
            },
          },
        });
        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#1a4731", "line-width": 2, "line-dasharray": [2, 2] },
        });
      }
    });

    return () => {
      map.remove(); // releases WebGL context
      mapRef.current = null;
    };
  }, [selectedSupplierId, projectCoords?.lat, projectCoords?.lng, relevantSuppliers.length]);

  return (
    <div className="flex h-full min-h-0">
      {/* Left: supplier list */}
      <div className="w-[40%] border-r border-[#E5E7EB] overflow-y-auto p-6 space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B7280] mb-4">
          Recommended suppliers · {isSpain ? "Spain" : "Europe"}
        </h2>
        {!projectCoords && (
          <p className="text-[11px] text-[#EAB308]">
            Set a site location first (section 01 SITE) to enable A4 calculations.
          </p>
        )}
        {relevantSuppliers.map((supplier) => {
          const res = results[supplier.id];
          const isSelected = supplier.id === selectedSupplierId;
          return (
            <div
              key={supplier.id}
              className={`border rounded-sm p-3 space-y-1.5 transition-colors ${isSelected ? "border-[#1a4731] bg-[#F0FDF4]" : "border-[#E5E7EB] bg-white"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-foreground">{supplier.name}</p>
                  <p className="text-[10px] text-[#6B7280]">{supplier.material}</p>
                  <p className="text-[10px] text-[#9CA3AF]">{supplier.location}</p>
                </div>
                <a
                  href={supplier.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#6B7280] hover:text-[#1a4731] shrink-0 mt-0.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
              <button
                onClick={() => handleCalculate(supplier)}
                disabled={!projectCoords}
                className="text-[10px] font-medium uppercase tracking-wider text-white px-2.5 py-1 rounded-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: "#1a4731" }}
              >
                Calculate A4 →
              </button>
              {res && (
                <p className="text-[10px] text-[#1a4731] font-medium tabular-nums">
                  {res.km.toLocaleString()} km · +{res.co2Kg.toLocaleString()} kg CO₂ A4
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Right: map */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="absolute inset-0" />
        {!import.meta.env.VITE_MAPBOX_TOKEN && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F9FAFB]">
            <p className="text-[11px] text-[#9CA3AF]">Set VITE_MAPBOX_TOKEN to show map</p>
          </div>
        )}
      </div>
    </div>
  );
}
