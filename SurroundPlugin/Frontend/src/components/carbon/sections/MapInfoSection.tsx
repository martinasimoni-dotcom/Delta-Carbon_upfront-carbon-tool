import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useBuilding } from "@/state/building";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoibWFydHNpbW85IiwiYSI6ImNtcDQweDJveTAwdHoyeHA2NHo2dWFwbjEifQ.m6hBtHEzpTEF15rpy0QjfA";

type Suggestion = { id: string; place_name: string; center: [number, number] };

export function MapInfoSection() {
  const searchLocation = useBuilding((s) => s.searchLocation);
  const setSearchLocation = useBuilding((s) => s.setSearchLocation);
  const selectedParcel = useBuilding((s) => s.selectedParcel);
  const buildingPlaced = useBuilding((s) => s.buildingPlaced);
  const placeBuilding = useBuilding((s) => s.placeBuilding);

  const [query, setQuery] = useState(searchLocation?.name ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query,
        )}.json?access_token=${MAPBOX_TOKEN}&limit=5&types=place,address,poi,neighborhood,locality`;
        const res = await fetch(url);
        const json = (await res.json()) as { features: Suggestion[] };
        setSuggestions(json.features ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  }, [query]);

  const choose = (s: Suggestion) => {
    setSearchLocation({ name: s.place_name, lat: s.center[1], lon: s.center[0] });
    setQuery(s.place_name);
    setOpen(false);
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="space-y-1.5 relative">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Search location
        </label>
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search a city, address or place…"
          className="h-8 text-xs"
        />
        {open && suggestions.length > 0 && (
          <div className="absolute z-10 left-0 right-0 mt-1 border border-border bg-popover shadow-md max-h-64 overflow-y-auto">
            {suggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => choose(s)}
                className="block w-full text-left px-3 py-2 text-xs hover:bg-muted/50 border-b border-border last:border-b-0"
              >
                {s.place_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {searchLocation && (
        <div className="pt-2 border-t border-border space-y-1">
          <Row k="Place" v={searchLocation.name} />
          <Row
            k="Coordinates"
            v={`${searchLocation.lat.toFixed(6)}, ${searchLocation.lon.toFixed(6)}`}
            mono
          />
        </div>
      )}

      <div className="pt-3 border-t border-border space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Selected parcel
        </div>
        {selectedParcel ? (
          <>
            <Row k="Parcel" v={selectedParcel.codi ?? selectedParcel.id} mono />
            {selectedParcel.referenciaCadastral && (
              <Row k="Cadastral ref" v={selectedParcel.referenciaCadastral} mono />
            )}
            {typeof selectedParcel.area === "number" && (
              <Row k="Area" v={`${selectedParcel.area.toFixed(1)} m²`} mono />
            )}
            {selectedParcel.illaId && <Row k="Illa" v={selectedParcel.illaId} mono />}
            {selectedParcel.districteId && (
              <Row k="District" v={selectedParcel.districteId} mono />
            )}
            {selectedParcel.maxHeightM && (
              <Row k="Max height" v={`${selectedParcel.maxHeightM} m`} mono />
            )}
            {!buildingPlaced ? (
              <button
                onClick={placeBuilding}
                disabled={!selectedParcel.plotCoords?.length}
                className="mt-3 w-full rounded-md bg-[#2C5F4C] px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#1F4435] disabled:opacity-50"
              >
                📍 Place Building on Plot
              </button>
            ) : (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-[#E8F5E9] px-3 py-2 text-xs font-medium text-[#2C5F4C]">
                <span>✓</span> Building placed on plot
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-1.5 rounded-full bg-muted-foreground/40" />
            Click a parcel on the map
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{k}</span>
      <span
        className={
          mono
            ? "font-mono tabular-nums text-foreground text-right truncate"
            : "text-foreground text-right truncate"
        }
        title={v}
      >
        {v}
      </span>
    </div>
  );
}
