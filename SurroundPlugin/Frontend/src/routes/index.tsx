import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/carbon/Header";
import { Footer } from "@/components/carbon/Footer";
import { Sidebar } from "@/components/carbon/Sidebar";
import { MapView } from "@/components/carbon/MapView";
import { useBuilding } from "@/state/building";

export const Route = createFileRoute("/")({
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

function Index() {
  const setUploadOpen = useBuilding((s) => s.setUploadOpen);
  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 min-w-0 relative">
          <MapView onPlotClick={() => setUploadOpen(true)} />
        </main>
        <Sidebar />
      </div>
      <Footer />
    </div>
  );
}
