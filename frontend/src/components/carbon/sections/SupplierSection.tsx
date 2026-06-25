import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { useBuilding } from "@/state/building";
import { getMaterial } from "@/lib/materials";

const TRANSPORT_FACTOR = 0.062; // kg CO₂e per tonne-km (road freight)

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
    initGoogleMaps?: () => void;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    const existing = document.getElementById("gm-script");
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    window.initGoogleMaps = () => resolve();
    const script = document.createElement("script");
    script.id = "gm-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps&loading=async&v=weekly`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });
}

type SupplierResult = {
  name: string;
  address: string;
  lat: number;
  lon: number;
  distanceKm: number;
  weightTonnes: number;
  transportCo2Kg: number;
};

export function SupplierSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placeElementRef = useRef<any>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<SupplierResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supplierCoords, setSupplierCoords] = useState<{ lat: number; lng: number } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const plotCenter = useBuilding((s) => s.plotCenter);
  const setTransportCo2Kg = useBuilding((s) => s.setTransportCo2Kg);
  const setSupplierName = useBuilding((s) => s.setSupplierName);
  const updateCurrentProject = useBuilding((s) => s.updateCurrentProject);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  useEffect(() => {
    if (!apiKey) {
      setMapsError("VITE_GOOGLE_MAPS_API_KEY not set");
      return;
    }
    loadGoogleMaps(apiKey)
      .then(() => setMapsReady(true))
      .catch((e) => setMapsError(String(e.message)));
  }, [apiKey]);

  useEffect(() => {
    if (!mapsReady || !containerRef.current || placeElementRef.current) return;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { PlaceAutocompleteElement } = await (window.google.maps.importLibrary("places")) as any;
      const placeAutocomplete = new PlaceAutocompleteElement();
      placeElementRef.current = placeAutocomplete;
      containerRef.current!.appendChild(placeAutocomplete);
      placeAutocomplete.addEventListener("gmp-select", async (event: Event) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const place = (event as any).placePrediction.toPlace();
        await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
        const supplierLat = place.location.lat();
        const supplierLon = place.location.lng();
        const { plotCenter: pc, elements: els } = useBuilding.getState();
        if (!pc) { setError("Set a site location first (section 01 SITE)."); return; }
        setSupplierCoords({ lat: supplierLat, lng: supplierLon });
        setCalculating(true);
        setError(null);
        setResult(null);
        try {
          const service = new window.google.maps.DistanceMatrixService();
          const response = await service.getDistanceMatrix({
            origins: [{ lat: supplierLat, lng: supplierLon }],
            destinations: [{ lat: pc.lat, lng: pc.lon }],
            travelMode: window.google.maps.TravelMode.DRIVING,
            unitSystem: window.google.maps.UnitSystem.METRIC,
          });
          const element = response.rows[0]?.elements[0];
          if (!element || element.status !== "OK") throw new Error("Distance Matrix returned no result");
          const distanceKm = element.distance.value / 1000;
          const heaviest = [...els].sort((a, b) => b.volumeM3 - a.volumeM3)[0];
          const mat = getMaterial(heaviest.materialId);
          const weightTonnes = (heaviest.volumeM3 * mat.density) / 1000;
          const transportCo2Kg = distanceKm * weightTonnes * TRANSPORT_FACTOR;
          const res: SupplierResult = {
            name: place.displayName ?? "Supplier",
            address: place.formattedAddress ?? "",
            lat: supplierLat,
            lon: supplierLon,
            distanceKm: Math.round(distanceKm),
            weightTonnes: Math.round(weightTonnes * 10) / 10,
            transportCo2Kg: Math.round(transportCo2Kg),
          };
          setResult(res);
          setTransportCo2Kg(transportCo2Kg);
          setSupplierName(res.name);
          updateCurrentProject();
        } catch (e) {
          setError(`Distance calculation failed: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
          setCalculating(false);
        }
      });
    })();
  }, [mapsReady]);

  // ── Mapbox map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!supplierCoords || !plotCenter || !mapContainerRef.current) return;

    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const mbToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!mbToken) return;

    mapboxgl.accessToken = mbToken;

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([plotCenter.lon, plotCenter.lat]);
    bounds.extend([supplierCoords.lng, supplierCoords.lat]);

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      bounds,
      fitBoundsOptions: { padding: 40 },
      interactive: false,
    });
    mapRef.current = map;

    map.on("load", () => {
      new mapboxgl.Marker({ color: "#1a4731" })
        .setLngLat([plotCenter.lon, plotCenter.lat])
        .setPopup(new mapboxgl.Popup().setText("Project"))
        .addTo(map);

      new mapboxgl.Marker({ color: "#EF4444" })
        .setLngLat([supplierCoords.lng, supplierCoords.lat])
        .setPopup(new mapboxgl.Popup().setText(result?.name ?? "Supplier"))
        .addTo(map);

      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [plotCenter.lon, plotCenter.lat],
              [supplierCoords.lng, supplierCoords.lat],
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
    });

    return () => { map.remove(); mapRef.current = null; };
  }, [supplierCoords, plotCenter]);


  if (!apiKey) {
    return (
      <p className="text-[10px] text-muted-foreground">
        Set <code className="bg-muted px-1 rounded text-foreground">VITE_GOOGLE_MAPS_API_KEY</code> in your <code className="bg-muted px-1 rounded text-foreground">.env</code> to enable supplier matching.
      </p>
    );
  }

  if (mapsError) {
    return <p className="text-[10px] text-red-500">{mapsError}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Search a supplier location. Road distance × material weight × 0.062 kg CO₂e/t·km = A4 transport carbon.
      </p>

      <div ref={containerRef} className="gmp-autocomplete-container" />

      {!plotCenter && (
        <p className="text-[10px] text-muted-foreground">Set a site location first.</p>
      )}

      {/* Map — shown once supplier is selected */}
      {supplierCoords && plotCenter && (
        <div
          ref={mapContainerRef}
          className="w-full rounded-sm border border-[#E5E7EB] overflow-hidden"
          style={{ height: "180px" }}
        />
      )}

      {supplierCoords && !plotCenter && (
        <p className="text-[11px] text-[#EAB308]">
          ⚠ Set a project location in section 01 SITE to see the route map
        </p>
      )}

      {calculating && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
          Calculating road distance…
        </div>
      )}

      {error && <p className="text-[10px] text-red-500">{error}</p>}

      {result && (
        <div className="border border-border rounded-sm p-3 space-y-2 text-xs">
          <div className="font-medium text-foreground">{result.name}</div>
          <div className="text-[10px] text-muted-foreground">{result.address}</div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <StatCell label="Distance" value={`${result.distanceKm} km`} />
            <StatCell label="Weight" value={`${result.weightTonnes} t`} />
            <StatCell label="A4 CO₂" value={`${result.transportCo2Kg} kg`} accent />
          </div>
          <p className="text-[9px] text-muted-foreground">
            Transport factor: {TRANSPORT_FACTOR} kg CO₂e / t·km (road freight). Added to running total.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-border rounded-sm p-2 text-center">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xs font-medium tabular-nums mt-0.5 ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}
