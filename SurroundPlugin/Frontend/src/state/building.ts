import { create } from "zustand";

export type ElementKind = "foundation" | "structure" | "envelope" | "floors" | "roof";

export type BuildingElement = {
  id: string;
  kind: ElementKind;
  label: string;
  volumeM3: number;
  materialId: string;
};

export type BuildingDims = { width: number; depth: number; height: number };
export type Transform = { scale: number; rotationY: number; x: number; z: number };
export type ModelSize = { x: number; y: number; z: number };

const defaultDims: BuildingDims = { width: 25, depth: 25, height: 60 };
const defaultTransform: Transform = { scale: 1, rotationY: 0, x: 0, z: 0 };

const buildDefaultElements = (d: BuildingDims): BuildingElement[] => {
  const footprint = d.width * d.depth;
  const perimeter = 2 * (d.width + d.depth);
  const floors = Math.max(1, Math.round(d.height / 3));
  return [
    { id: "foundation", kind: "foundation", label: "Foundation", volumeM3: footprint * 1.0, materialId: "concrete-c30" },
    { id: "structure", kind: "structure", label: "Structure (columns/beams)", volumeM3: footprint * 0.05 * floors, materialId: "concrete-c30" },
    { id: "envelope", kind: "envelope", label: "Envelope (façade)", volumeM3: perimeter * d.height * 0.3, materialId: "brick-red" },
    { id: "floors", kind: "floors", label: "Floors / slabs", volumeM3: footprint * 0.25 * floors, materialId: "concrete-c20" },
    { id: "roof", kind: "roof", label: "Roof", volumeM3: footprint * 0.3, materialId: "steel-struct" },
  ];
};

type State = {
  dims: BuildingDims;
  elements: BuildingElement[];
  modelUrl: string | null;
  modelKind: "obj" | "gltf" | null;
  modelName: string | null;
  modelSize: ModelSize | null;
  transform: Transform;
  uploadOpen: boolean;
  plotCenter: { lat: number; lon: number } | null;
  setPlotCenter: (c: { lat: number; lon: number } | null) => void;
  selectedBuilding: { id: string | number; height: number; lat: number; lon: number; address?: string } | null;
  setSelectedBuilding: (b: State["selectedBuilding"]) => void;
  searchLocation: { name: string; lat: number; lon: number } | null;
  setSearchLocation: (l: State["searchLocation"]) => void;
  selectedParcel: {
    id: string;
    codi?: string;
    area?: number;
    referenciaCadastral?: string;
    illaId?: string;
    districteId?: string;
    maxHeightM?: number;
    plotCoords?: [number, number][];
  } | null;
  setSelectedParcel: (p: State["selectedParcel"]) => void;
  buildingPlaced: boolean;
  placeBuilding: () => void;
  clearPlacedBuilding: () => void;
  setDims: (d: Partial<BuildingDims>) => void;
  setMaterial: (elementId: string, materialId: string) => void;
  setVolume: (elementId: string, volumeM3: number) => void;
  loadModel: (url: string, kind: "obj" | "gltf", name: string) => void;
  clearModel: () => void;
  setModelSize: (s: ModelSize) => void;
  setTransform: (t: Partial<Transform>) => void;
  resetTransform: () => void;
  setUploadOpen: (v: boolean) => void;
  reset: () => void;
};

export const useBuilding = create<State>((set) => ({
  dims: defaultDims,
  elements: buildDefaultElements(defaultDims),
  modelUrl: null,
  modelKind: null,
  modelName: null,
  modelSize: null,
  transform: defaultTransform,
  uploadOpen: false,
  plotCenter: null,
  setPlotCenter: (plotCenter) => set({ plotCenter }),
  selectedBuilding: null,
  setSelectedBuilding: (selectedBuilding) => set({ selectedBuilding }),
  searchLocation: null,
  setSearchLocation: (searchLocation) => set({ searchLocation }),
  selectedParcel: null,
  setSelectedParcel: (selectedParcel) => set({ selectedParcel, buildingPlaced: false }),
  buildingPlaced: false,
  placeBuilding: () => set({ buildingPlaced: true }),
  clearPlacedBuilding: () => set({ buildingPlaced: false }),
  setDims: (d) =>
    set((s) => {
      const dims = { ...s.dims, ...d };
      return { dims, elements: buildDefaultElements(dims).map((ne, i) => ({ ...ne, materialId: s.elements[i]?.materialId ?? ne.materialId })) };
    }),
  setMaterial: (elementId, materialId) =>
    set((s) => ({ elements: s.elements.map((e) => (e.id === elementId ? { ...e, materialId } : e)) })),
  setVolume: (elementId, volumeM3) =>
    set((s) => ({ elements: s.elements.map((e) => (e.id === elementId ? { ...e, volumeM3 } : e)) })),
  loadModel: (url, kind, name) => set({ modelUrl: url, modelKind: kind, modelName: name, transform: defaultTransform, uploadOpen: false }),
  clearModel: () => set({ modelUrl: null, modelKind: null, modelName: null, modelSize: null, transform: defaultTransform }),
  setModelSize: (modelSize) => set({ modelSize }),
  setTransform: (t) => set((s) => ({ transform: { ...s.transform, ...t } })),
  resetTransform: () => set({ transform: defaultTransform }),
  setUploadOpen: (uploadOpen) => set({ uploadOpen }),
  reset: () => set({ dims: defaultDims, elements: buildDefaultElements(defaultDims), modelUrl: null, modelKind: null, modelName: null, modelSize: null, transform: defaultTransform }),
}));
