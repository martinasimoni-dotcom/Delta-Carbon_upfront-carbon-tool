import { useEffect, useRef, useState } from "react";
import { useBuilding } from "@/state/building";
import { Input } from "@/components/ui/input";

const BUILDING_USES = ["Residential", "Office", "Mixed-use", "Educational", "Industrial", "Cultural"];

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
    initGoogleMapsModal?: () => void;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(); return; }
    const existing = document.getElementById("gm-script");
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    window.initGoogleMapsModal = () => resolve();
    const script = document.createElement("script");
    script.id = "gm-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsModal&loading=async&v=weekly`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });
}

type LocationValue = { name: string; lat: number; lng: number } | null;

export function CreateProjectModal() {
  const open = useBuilding((s) => s.createProjectModalOpen);
  const editProjectId = useBuilding((s) => s.editingProjectId);
  const setOpen = useBuilding((s) => s.setCreateProjectModalOpen);
  const createProject = useBuilding((s) => s.createProject);
  const projects = useBuilding((s) => s.projects);

  const editProject = editProjectId ? projects.find((p) => p.id === editProjectId) : null;
  const isEdit = !!editProject;

  const [name, setName] = useState(editProject?.name ?? "");
  const [buildingUse, setBuildingUse] = useState(editProject?.buildingUse ?? "");
  const [gfa, setGfa] = useState(editProject?.gfa ?? 0);
  const [floors, setFloors] = useState(editProject?.floors ?? 0);
  const [location, setLocation] = useState<LocationValue>(
    editProject?.locationCoords
      ? { name: editProject.location, lat: editProject.locationCoords.lat, lng: editProject.locationCoords.lng }
      : null,
  );
  const [locationQuery, setLocationQuery] = useState(editProject?.location ?? "");
  const [locationSelected, setLocationSelected] = useState(!!editProject?.locationCoords);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mapsReady, setMapsReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placeElementRef = useRef<any>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  // Reset form when modal opens / edit target changes
  useEffect(() => {
    if (!open) return;
    setName(editProject?.name ?? "");
    setBuildingUse(editProject?.buildingUse ?? "");
    setGfa(editProject?.gfa ?? 0);
    setFloors(editProject?.floors ?? 0);
    const loc = editProject?.locationCoords
      ? { name: editProject.location, lat: editProject.locationCoords.lat, lng: editProject.locationCoords.lng }
      : null;
    setLocation(loc);
    setLocationQuery(editProject?.location ?? "");
    setLocationSelected(!!loc);
    setErrors({});
  }, [open, editProjectId]);

  // Load Google Maps and attach autocomplete
  useEffect(() => {
    if (!open || !apiKey) return;
    loadGoogleMaps(apiKey)
      .then(() => setMapsReady(true))
      .catch(() => {/* graceful degradation */});
  }, [open, apiKey]);

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
        const name = place.formattedAddress ?? place.displayName ?? "";
        setLocationQuery(name);
        setLocation({ name, lat: place.location.lat(), lng: place.location.lng() });
        setLocationSelected(true);
        setErrors((e) => { const n = { ...e }; delete n.location; return n; });
      });
    })();
  }, [mapsReady]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name || name.trim().length < 2) errs.name = "Project name must be at least 2 characters";
    if (!buildingUse) errs.buildingUse = "Select a building use";
    if (!locationSelected || !location) errs.location = "Select a location from the suggestions";
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    if (isEdit && editProject) {
      // Edit mode: update the project in place
      // We repurpose updateCurrentProject after setting state — simpler than a separate updateProject action
      // Set as current so updateCurrentProject targets it, then update its metadata directly
      const store = useBuilding.getState();
      store.setCurrentProject(editProject.id);
      // Update metadata fields on the project directly
      useBuilding.setState((s) => ({
        projects: s.projects.map((p) =>
          p.id === editProject.id
            ? {
                ...p,
                name: name.trim(),
                buildingUse,
                gfa,
                floors,
                location: location!.name,
                locationCoords: { lat: location!.lat, lng: location!.lng },
                updatedAt: new Date().toISOString(),
              }
            : p,
        ),
      }));
      setOpen(false);
    } else {
      // Create mode
      const project = createProject({
        name: name.trim(),
        buildingUse,
        location: location!.name,
        locationCoords: { lat: location!.lat, lng: location!.lng },
        gfa,
        floors,
      });

      // Notify the Rhino panel
      try {
        await fetch("/api/plugin/project", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectName: project.name, projectId: project.id, location: project.location }),
        });
      } catch {
        // Vite dev server not running — ignore
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-[480px] mx-4 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-bold text-foreground tracking-wide">
          {isEdit ? "Edit Project" : "Create New Project"}
        </h2>

        {/* Project name */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Project name <span className="text-red-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((prev) => { const n = { ...prev }; delete n.name; return n; }); }}
            placeholder="e.g. Office Tower Milan"
            className="h-8 text-xs"
          />
          {errors.name && <p className="text-[10px] text-red-500">{errors.name}</p>}
        </div>

        {/* Building use */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Building use <span className="text-red-500">*</span>
          </label>
          <select
            value={buildingUse}
            onChange={(e) => { setBuildingUse(e.target.value); setErrors((prev) => { const n = { ...prev }; delete n.buildingUse; return n; }); }}
            className="w-full h-8 rounded-sm border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:border-primary"
          >
            <option value="" disabled>Select…</option>
            {BUILDING_USES.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          {errors.buildingUse && <p className="text-[10px] text-red-500">{errors.buildingUse}</p>}
        </div>

        {/* Location */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Location <span className="text-red-500">*</span>
          </label>
          {!apiKey && (
            <p className="w-full h-8 flex items-center rounded-sm border border-border bg-background px-3 text-xs text-muted-foreground opacity-50">
              Google Maps API key not set
            </p>
          )}
          {apiKey && (
            <div
              ref={containerRef}
              className="gmp-autocomplete-container"
            />
          )}
          {locationSelected && location && (
            <p className="text-[10px] text-green-600">✓ {location.name}</p>
          )}
          {errors.location && <p className="text-[10px] text-red-500">{errors.location}</p>}
        </div>

        {/* GFA */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Gross floor area (m²)
          </label>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={gfa === 0 ? '' : String(gfa)}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setGfa(val === '' ? 0 : parseInt(val, 10));
            }}
            placeholder="e.g. 2000"
            className="h-8 text-xs"
          />
        </div>

        {/* Floors */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Number of floors
          </label>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={floors === 0 ? '' : String(floors)}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setFloors(val === '' ? 0 : parseInt(val, 10));
            }}
            placeholder="e.g. 4"
            className="h-8 text-xs"
          />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full rounded-sm py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:opacity-90"
          style={{ backgroundColor: "#1a4731" }}
        >
          {isEdit ? "Save Changes" : "Create Project"}
        </button>
      </div>
    </div>
  );
}
