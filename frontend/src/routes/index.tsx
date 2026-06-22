import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Header } from "@/components/carbon/Header";
import { Footer } from "@/components/carbon/Footer";
import { Sidebar } from "@/components/carbon/Sidebar";
import { BuildingViewer } from "@/components/carbon/BuildingViewer";
import { CreateProjectModal } from "@/components/carbon/CreateProjectModal";
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

function Index() {
  useRhinoSync();
  usePlotBroadcast();
  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 min-w-0 relative">
          <BuildingViewer />
        </main>
        <Sidebar />
      </div>
      <Footer />
      <CreateProjectModal />
    </div>
  );
}
