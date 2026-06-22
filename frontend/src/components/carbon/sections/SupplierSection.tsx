import { useEffect, useRef, useState } from "react";
import { useBuilding } from "@/state/building";
import { getMaterial } from "@/lib/materials";

const TRANSPORT_FACTOR = 0.062; // kg CO₂e per tonne-km (road freight)

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps?: () => void;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) { resolve(); return; }
    const existing = document.getElementById("gm-script");
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    window.initGoogleMaps = () => resolve();
    const script = document.createElement("script");
    script.id = "gm-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<SupplierResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plotCenter = useBuilding((s) => s.plotCenter);
  const elements = useBuilding((s) => s.elements);
  const setTransportCo2Kg = useBuilding((s) => s.setTransportCo2Kg);

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
    if (!mapsReady || !inputRef.current || autocompleteRef.current) return;
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["establishment", "geocode"],
    });
    autocompleteRef.current.addListener("place_changed", handlePlaceChanged);
  }, [mapsReady]);

  const handlePlaceChanged = async () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry?.location) return;
    if (!plotCenter) {
      setError("Set a site location first (section 01 SITE).");
      return;
    }

    const supplierLat = place.geometry.location.lat();
    const supplierLon = place.geometry.location.lng();

    setCalculating(true);
    setError(null);
    setResult(null);

    try {
      // Distance Matrix API: supplier → project plot
      const service = new window.google.maps.DistanceMatrixService();
      const response = await service.getDistanceMatrix({
        origins: [{ lat: supplierLat, lng: supplierLon }],
        destinations: [{ lat: plotCenter.lat, lng: plotCenter.lon }],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC,
      });

      const element = response.rows[0]?.elements[0];
      if (!element || element.status !== "OK") {
        throw new Error("Distance Matrix returned no result");
      }

      const distanceKm = element.distance.value / 1000;

      // Use the largest-volume element's material density for weight estimate
      const heaviest = [...elements].sort((a, b) => b.volumeM3 - a.volumeM3)[0];
      const mat = getMaterial(heaviest.materialId);
      const weightTonnes = (heaviest.volumeM3 * mat.density) / 1000;
      const transportCo2Kg = distanceKm * weightTonnes * TRANSPORT_FACTOR;

      const res: SupplierResult = {
        name: place.name ?? "Supplier",
        address: place.formatted_address ?? "",
        lat: supplierLat,
        lon: supplierLon,
        distanceKm: Math.round(distanceKm),
        weightTonnes: Math.round(weightTonnes * 10) / 10,
        transportCo2Kg: Math.round(transportCo2Kg),
      };

      setResult(res);
      setTransportCo2Kg(transportCo2Kg);
    } catch (e) {
      setError(`Distance calculation failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCalculating(false);
    }
  };

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

      <input
        ref={inputRef}
        type="text"
        placeholder={mapsReady ? "Search supplier address…" : "Loading Maps…"}
        disabled={!mapsReady || !plotCenter}
        className="w-full rounded-sm border border-border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground disabled:opacity-50 focus:outline-none focus:border-primary"
      />

      {!plotCenter && (
        <p className="text-[10px] text-muted-foreground">Set a site location first.</p>
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
