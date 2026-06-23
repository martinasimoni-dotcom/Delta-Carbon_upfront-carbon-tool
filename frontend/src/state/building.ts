import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getMaterial } from "@/lib/materials";

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

export interface ProjectOption {
  id: string;
  name: string;
  createdAt: string;
  elements: BuildingElement[];
  transportCo2Kg: number;
  supplierName: string | null;
  totalCo2Kg: number;
  renderUrl: string | null;
}

export interface Project {
  id: string;
  name: string;
  buildingUse: string;
  location: string;
  locationCoords: { lat: number; lng: number } | null;
  gfa: number;
  floors: number;
  createdAt: string;
  updatedAt: string;
  elements: BuildingElement[];
  transportCo2Kg: number;
  supplierName: string | null;
  options: ProjectOption[];
}

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
  // ── workspace ────────────────────────────────────────────────────────────────
  dims: BuildingDims;
  elements: BuildingElement[];
  transportCo2Kg: number;
  setTransportCo2Kg: (kg: number) => void;
  supplierName: string | null;
  setSupplierName: (name: string | null) => void;
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
  loadFromRhino: (dims: BuildingDims, volumes: Array<{ id: string; volumeM3: number }>, location?: { lat: number; lon: number } | null) => void;
  setMaterial: (elementId: string, materialId: string) => void;
  setVolume: (elementId: string, volumeM3: number) => void;
  loadModel: (url: string, kind: "obj" | "gltf", name: string) => void;
  clearModel: () => void;
  setModelSize: (s: ModelSize) => void;
  setTransform: (t: Partial<Transform>) => void;
  resetTransform: () => void;
  setUploadOpen: (v: boolean) => void;
  reset: () => void;

  // ── projects ─────────────────────────────────────────────────────────────────
  projects: Project[];
  currentProjectId: string | null;
  createProjectModalOpen: boolean;
  editingProjectId: string | null;
  setCreateProjectModalOpen: (open: boolean, editProjectId?: string | null) => void;
  createProject: (data: Omit<Project, "id" | "createdAt" | "updatedAt" | "elements" | "transportCo2Kg" | "supplierName" | "options">) => Project;
  setCurrentProject: (id: string) => void;
  updateCurrentProject: () => void;
  deleteProject: (id: string) => void;
  saveOption: (name?: string) => ProjectOption;
  loadOption: (optionId: string) => void;
  deleteOption: (optionId: string) => void;
  renameOption: (optionId: string, newName: string) => void;
  setOptionRender: (optionId: string, renderUrl: string) => void;

  // ── auth ──────────────────────────────────────────────────────────────────────
  isLoggedIn: boolean;
  user: { name: string; email: string } | null;
  login: () => void;
  logout: () => void;

  // ── legacy compat ─────────────────────────────────────────────────────────────
  currentProjectName: string | null;
  setCurrentProjectName: (name: string | null) => void;
};

export const useBuilding = create<State>()(
  persist(
    (set, get) => ({
      // ── workspace ──────────────────────────────────────────────────────────────
      dims: defaultDims,
      elements: buildDefaultElements(defaultDims),
      transportCo2Kg: 0,
      setTransportCo2Kg: (transportCo2Kg) => set({ transportCo2Kg }),
      supplierName: null,
      setSupplierName: (supplierName) => set({ supplierName }),
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
      loadFromRhino: (dims, volumes, location) =>
        set((s) => {
          const elements = buildDefaultElements(dims).map((ne, i) => ({
            ...ne,
            materialId: s.elements[i]?.materialId ?? ne.materialId,
            volumeM3: volumes.find((v) => v.id === ne.id)?.volumeM3 ?? ne.volumeM3,
          }));
          if (!location) return { dims, elements };

          const mPerDegLat = 111320;
          const mPerDegLng = 111320 * Math.cos((location.lat * Math.PI) / 180);
          const halfWdeg = dims.width / 2 / mPerDegLng;
          const halfDdeg = dims.depth / 2 / mPerDegLat;
          const plotCoords: [number, number][] = [
            [location.lon - halfWdeg, location.lat - halfDdeg],
            [location.lon + halfWdeg, location.lat - halfDdeg],
            [location.lon + halfWdeg, location.lat + halfDdeg],
            [location.lon - halfWdeg, location.lat + halfDdeg],
            [location.lon - halfWdeg, location.lat - halfDdeg],
          ];
          return {
            dims,
            elements,
            plotCenter: location,
            searchLocation: { name: "Rhino model", lat: location.lat, lon: location.lon },
            selectedParcel: {
              id: "rhino-sync",
              codi: "Rhino Model",
              area: dims.width * dims.depth,
              maxHeightM: dims.height,
              plotCoords,
            },
            buildingPlaced: dims.width > 0 && dims.height > 0,
          };
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

      // ── projects ───────────────────────────────────────────────────────────────
      projects: [],
      currentProjectId: null,
      createProjectModalOpen: false,
      editingProjectId: null,
      setCreateProjectModalOpen: (createProjectModalOpen, editProjectId = null) =>
        set({ createProjectModalOpen, editingProjectId: editProjectId ?? null }),

      createProject: (data) => {
        const now = new Date().toISOString();
        const s = get();
        const project: Project = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          elements: s.elements,
          transportCo2Kg: s.transportCo2Kg,
          supplierName: s.supplierName,
          options: [],
        };
        set((prev) => ({
          projects: [...prev.projects, project],
          currentProjectId: project.id,
          createProjectModalOpen: false,
          // Load project location into workspace
          searchLocation: data.locationCoords
            ? { name: data.location, lat: data.locationCoords.lat, lon: data.locationCoords.lng }
            : prev.searchLocation,
          plotCenter: data.locationCoords
            ? { lat: data.locationCoords.lat, lon: data.locationCoords.lng }
            : prev.plotCenter,
        }));
        return project;
      },

      setCurrentProject: (id) => {
        const { projects } = get();
        const project = projects.find((p) => p.id === id);
        if (!project) return;
        set({
          currentProjectId: id,
          elements: project.elements,
          transportCo2Kg: project.transportCo2Kg,
          supplierName: project.supplierName,
          searchLocation: project.locationCoords
            ? { name: project.location, lat: project.locationCoords.lat, lon: project.locationCoords.lng }
            : null,
          plotCenter: project.locationCoords
            ? { lat: project.locationCoords.lat, lon: project.locationCoords.lng }
            : null,
        });
      },

      updateCurrentProject: () => {
        const { currentProjectId, projects, elements, transportCo2Kg, supplierName } = get();
        if (!currentProjectId) return;
        set({
          projects: projects.map((p) =>
            p.id === currentProjectId
              ? { ...p, elements, transportCo2Kg, supplierName, updatedAt: new Date().toISOString() }
              : p,
          ),
        });
      },

      deleteProject: (id) => {
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
        }));
      },

      saveOption: (name) => {
        const { currentProjectId, projects, elements, transportCo2Kg, supplierName } = get();
        if (!currentProjectId) throw new Error("No active project");
        const project = projects.find((p) => p.id === currentProjectId);
        if (!project) throw new Error("Project not found");
        const existing = project.options ?? [];
        const optionName = name ?? `Option ${existing.length + 1}`;
        const totalCo2Kg = elements.reduce((s, e) => s + e.volumeM3 * getMaterial(e.materialId).co2PerM3, 0) + (transportCo2Kg ?? 0);
        const option: ProjectOption = {
          id: crypto.randomUUID(),
          name: optionName,
          createdAt: new Date().toISOString(),
          elements: elements.map((e) => ({ ...e })),
          transportCo2Kg: transportCo2Kg ?? 0,
          supplierName,
          totalCo2Kg,
          renderUrl: null,
        };
        set({
          projects: projects.map((p) =>
            p.id === currentProjectId
              ? { ...p, options: [...existing, option], updatedAt: new Date().toISOString() }
              : p,
          ),
        });
        return option;
      },

      loadOption: (optionId) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;
        const project = projects.find((p) => p.id === currentProjectId);
        const option = (project?.options ?? []).find((o) => o.id === optionId);
        if (!option) return;
        set({
          elements: option.elements.map((e) => ({ ...e })),
          transportCo2Kg: option.transportCo2Kg,
          supplierName: option.supplierName,
        });
      },

      deleteOption: (optionId) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;
        set({
          projects: projects.map((p) =>
            p.id === currentProjectId
              ? { ...p, options: (p.options ?? []).filter((o) => o.id !== optionId), updatedAt: new Date().toISOString() }
              : p,
          ),
        });
      },

      renameOption: (optionId, newName) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;
        set({
          projects: projects.map((p) =>
            p.id === currentProjectId
              ? { ...p, options: (p.options ?? []).map((o) => o.id === optionId ? { ...o, name: newName } : o) }
              : p,
          ),
        });
      },

      setOptionRender: (optionId, renderUrl) => {
        const { currentProjectId, projects } = get();
        if (!currentProjectId) return;
        set({
          projects: projects.map((p) =>
            p.id === currentProjectId
              ? { ...p, options: (p.options ?? []).map((o) => o.id === optionId ? { ...o, renderUrl } : o) }
              : p,
          ),
        });
      },

      // ── auth ───────────────────────────────────────────────────────────────────
      isLoggedIn: false as boolean,
      user: null as { name: string; email: string } | null,
      login: () => set({ isLoggedIn: true, user: { name: "Demo User", email: "demo@deltacarbon.app" } }),
      logout: () => set({ isLoggedIn: false, user: null, currentProjectId: null }),

      // ── legacy compat ──────────────────────────────────────────────────────────
      currentProjectName: null,
      setCurrentProjectName: (currentProjectName) => set({ currentProjectName }),
    }),
    {
      name: "delta-carbon-projects",
      partialize: (s) => ({ projects: s.projects, currentProjectId: s.currentProjectId, isLoggedIn: s.isLoggedIn, user: s.user }),
      onRehydrateStorage: () => (state) => {
        if (!state?.currentProjectId) return;
        const project = state.projects.find((p) => p.id === state.currentProjectId);
        if (!project) return;
        state.elements = project.elements;
        state.transportCo2Kg = project.transportCo2Kg;
        state.supplierName = project.supplierName;
        if (project.locationCoords) {
          state.searchLocation = { name: project.location, lat: project.locationCoords.lat, lon: project.locationCoords.lng };
          state.plotCenter = { lat: project.locationCoords.lat, lon: project.locationCoords.lng };
        }
      },
    },
  ),
);
