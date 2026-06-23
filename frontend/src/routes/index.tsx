import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/carbon/Header";
import { Footer } from "@/components/carbon/Footer";
import { Sidebar } from "@/components/carbon/Sidebar";
import { BuildingViewer } from "@/components/carbon/BuildingViewer";
import { CreateProjectModal } from "@/components/carbon/CreateProjectModal";
import { ImportOBJButton } from "@/components/carbon/ImportOBJButton";
import { SuppliersView } from "@/components/carbon/views/SuppliersView";
import { CompareView } from "@/components/carbon/views/CompareView";
import { useBuilding } from "@/state/building";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const { isLoggedIn, currentProjectId } = useBuilding.getState();
    if (!isLoggedIn) throw redirect({ to: "/login" });
    if (!currentProjectId) throw redirect({ to: "/dashboard" });
  },
  component: Index,
  head: () => ({
    meta: [
      { title: "Embodied Carbon Tool — Barcelona Poble Nou" },
      {
        name: "description",
        content:
          "Professional 3D embodied carbon assessment tool with real EPD data from MaterialePyramiden.",
      },
    ],
  }),
});

function useRhinoSync() {
  const loadFromRhino = useBuilding((s) => s.loadFromRhino);
  const lastUpdated = useRef<number>(0);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/v1/carbon/estimate");
        if (!res.ok) return;
        const data = await res.json() as {
          ready: boolean;
          updatedAt?: number;
          dims?: { width: number; depth: number; height: number };
          elements?: Array<{ id: string; volumeM3: number }>;
          location?: { lat: number; lon: number } | null;
        };
        if (!data.ready || !data.updatedAt || data.updatedAt <= lastUpdated.current) return;
        if (!data.dims || !data.elements) return;
        lastUpdated.current = data.updatedAt;
        loadFromRhino(data.dims, data.elements, data.location);
      } catch { /* network error — silent */ }
    };
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [loadFromRhino]);
}

function usePlotBroadcast() {
  const selectedParcel = useBuilding((s) => s.selectedParcel);
  const plotCenter = useBuilding((s) => s.plotCenter);

  useEffect(() => {
    if (!selectedParcel || selectedParcel.id === "rhino-sync" || !plotCenter) return;
    fetch("/api/plot/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: plotCenter.lat, lon: plotCenter.lon, id: selectedParcel.id }),
    }).catch(() => {});
  }, [selectedParcel, plotCenter]);
}

const TABS = [
  { id: "model", label: "3D Model" },
  { id: "suppliers", label: "Suppliers" },
  { id: "compare", label: "Compare" },
] as const;

type Tab = (typeof TABS)[number]["id"];

function Index() {
  useRhinoSync();
  usePlotBroadcast();
  const [activeTab, setActiveTab] = useState<Tab>("model");

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      <Header />

      {/* Top navigation */}
      <div className="shrink-0 bg-white border-b border-[#E5E7EB] flex items-center px-6 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-[#1a4731] text-[#1a4731] font-semibold"
                : "border-transparent text-[#6B7280] hover:text-[#111111]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "model" && (
        <>
          <div className="flex flex-1 min-h-0">
            <main className="flex-1 min-w-0 relative">
              <div className="absolute top-2 left-2 z-10">
                <ImportOBJButton />
              </div>
              <BuildingViewer />
            </main>
            <Sidebar />
          </div>
          <Footer />
        </>
      )}

      {activeTab === "suppliers" && (
        <div className="flex-1 min-h-0">
          <SuppliersView />
        </div>
      )}

      {activeTab === "compare" && (
        <div className="flex-1 min-h-0 bg-[#FAFAFA]">
          <CompareView />
        </div>
      )}

      <CreateProjectModal />
    </div>
  );
}
