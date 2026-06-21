import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ElementsSection } from "./sections/ElementsSection";
import { ResultsSection } from "./sections/ResultsSection";
import { MapInfoSection } from "./sections/MapInfoSection";
import { OptimizeSection } from "./sections/OptimizeSection";
import { SupplierSection } from "./sections/SupplierSection";

// ── 1. Connect to Rhino ──────────────────────────────────────────────────────

function RhinoConnectSection() {
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [status, setStatus] = useState<"idle" | "syncing" | "ok" | "error">("idle");

  // Detect when a new model arrives by watching /api/model/current
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/model/current");
        if (res.ok) setLastSync(new Date());
      } catch { /* no-op */ }
    };
    const id = setInterval(check, 3000);
    return () => clearInterval(id);
  }, []);

  const handleSync = async () => {
    setStatus("syncing");
    try {
      // Trigger the Rhino side via the bridge endpoint — if it responds the
      // plugin has already sent the latest model; we just acknowledge it.
      const res = await fetch("/api/model/current");
      if (res.ok) {
        setLastSync(new Date());
        setStatus("ok");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 3000);
  };

  const dot =
    status === "ok"    ? "bg-emerald-500" :
    status === "error" ? "bg-red-500"     :
    status === "syncing" ? "bg-yellow-400 animate-pulse" :
    lastSync            ? "bg-emerald-500" : "bg-zinc-500";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`inline-block size-2 rounded-full ${dot}`} />
        <span className="text-xs text-muted-foreground">
          {status === "syncing" ? "Syncing…" :
           status === "error"   ? "Connection failed" :
           lastSync             ? `Last sync ${lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` :
           "Run SurroundSync in Rhino"}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Run <code className="bg-muted px-1 rounded text-foreground">SurroundSync</code> inside
        Rhino to push the current model geometry and carbon data here.
      </p>
      <button
        onClick={handleSync}
        disabled={status === "syncing"}
        className="w-full rounded-sm border border-border bg-muted/30 px-3 py-2 text-xs
                   font-medium text-foreground hover:bg-muted/60 disabled:opacity-50
                   transition-colors"
      >
        {status === "syncing" ? "Syncing…" : "↺  Sync from Rhino"}
      </button>
    </div>
  );
}

// ── 5. Material suggestions wrapper (adds prototype subtitle) ────────────────

function MaterialSuggestionsSection() {
  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground">
        Prototype — RAG pipeline in development
      </p>
      <OptimizeSection />
    </div>
  );
}

// ── 6. Suppliers ─────────────────────────────────────────────────────────────

function SuppliersSection() {
  return <SupplierSection />;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const sections = [
  { id: "site",      n: "01", title: "Site",                      body: <MapInfoSection /> },
  { id: "connect",   n: "02", title: "Connect to Rhino",          body: <RhinoConnectSection /> },
  { id: "elements",  n: "03", title: "Building Elements",          body: <ElementsSection /> },
  { id: "results",   n: "04", title: "CO₂ Results",               body: <ResultsSection /> },
  { id: "optimize",  n: "05", title: "Material Suggestions",       body: <MaterialSuggestionsSection /> },
  { id: "suppliers", n: "06", title: "Suppliers",                  body: <SuppliersSection /> },
];

export function Sidebar() {
  return (
    <aside className="w-[380px] border-l border-border bg-background overflow-y-auto">
      <Accordion
        type="multiple"
        defaultValue={["site", "connect", "elements", "results"]}
        className="w-full"
      >
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
    </aside>
  );
}
