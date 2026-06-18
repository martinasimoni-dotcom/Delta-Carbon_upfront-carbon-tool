import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ElementsSection } from "./sections/ElementsSection";
import { ResultsSection } from "./sections/ResultsSection";

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

// ── 4. Optimization (placeholder) ───────────────────────────────────────────

function OptimizeSection() {
  return (
    <div className="rounded-sm border border-border bg-muted/20 px-4 py-6 text-center space-y-1">
      <p className="text-xs font-medium text-foreground">AI suggestions coming soon</p>
      <p className="text-[10px] text-muted-foreground">
        Material substitution and structural optimisation powered by machine learning.
      </p>
    </div>
  );
}

// ── 5. Suppliers (placeholder) ───────────────────────────────────────────────

function SuppliersSection() {
  return (
    <div className="rounded-sm border border-border bg-muted/20 px-4 py-6 text-center space-y-1">
      <p className="text-xs font-medium text-foreground">Local suppliers — Barcelona, Catalonia</p>
      <p className="text-[10px] text-muted-foreground">
        Verified low-carbon material suppliers within 150 km.
      </p>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const sections = [
  { id: "connect",   n: "01", title: "Connect to Rhino",   body: <RhinoConnectSection /> },
  { id: "elements",  n: "02", title: "Building Elements",   body: <ElementsSection /> },
  { id: "results",   n: "03", title: "CO₂ Results",         body: <ResultsSection /> },
  { id: "optimize",  n: "04", title: "Optimization",        body: <OptimizeSection /> },
  { id: "suppliers", n: "05", title: "Suppliers",           body: <SuppliersSection /> },
];

export function Sidebar() {
  return (
    <aside className="w-[380px] border-l border-border bg-background overflow-y-auto">
      <Accordion
        type="multiple"
        defaultValue={["connect", "elements", "results"]}
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
