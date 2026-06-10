import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MapInfoSection } from "./sections/MapInfoSection";
import { ImportSection } from "./sections/ImportSection";
import { TransformSection } from "./sections/TransformSection";
import { ElementsSection } from "./sections/ElementsSection";
import { ResultsSection } from "./sections/ResultsSection";
import { OptimizeSection } from "./sections/OptimizeSection";
import { PlotUploadDialog } from "./PlotUploadDialog";

const sections = [
  { id: "site", n: "01", title: "Site", body: <MapInfoSection /> },
  { id: "import", n: "02", title: "Import Model", body: <ImportSection /> },
  { id: "transform", n: "03", title: "Placement", body: <TransformSection /> },
  { id: "elements", n: "04", title: "Building Elements", body: <ElementsSection /> },
  { id: "results", n: "05", title: "CO₂ Results", body: <ResultsSection /> },
  { id: "optimize", n: "06", title: "Optimization", body: <OptimizeSection /> },
];

export function Sidebar() {
  return (
    <aside className="w-[380px] border-l border-border bg-background overflow-y-auto">
      <Accordion type="multiple" defaultValue={["site", "elements", "results"]} className="w-full">
        {sections.map((s) => (
          <AccordionItem key={s.id} value={s.id} className="border-b border-border">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-baseline gap-3">
                <span className="text-[10px] tracking-wider text-muted-foreground tabular-nums">
                  {s.n}
                </span>
                <span className="text-xs uppercase tracking-wider font-medium text-foreground">
                  {s.title}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">{s.body}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <PlotUploadDialog />
    </aside>
  );
}
