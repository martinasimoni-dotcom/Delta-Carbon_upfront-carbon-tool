import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { AxonometricPanel } from "@/components/evidence/AxonometricPanel";
import { SupplierMapPanel } from "@/components/evidence/SupplierMapPanel";
import { CarbonDeltaPanel } from "@/components/evidence/CarbonDeltaPanel";

export const Route = createFileRoute("/evidence")({
  component: EvidencePage,
  head: () => ({
    meta: [
      { title: "Delta Carbon — Design Evidence" },
      {
        name: "description",
        content: "Delta Carbon upfront carbon assessment — design evidence",
      },
    ],
  }),
});

function EvidencePage() {
  return (
    <div className="min-h-screen w-full" style={{ background: "#f5f4f0" }}>
      <header className="h-[60px] border-b border-[#e8e8e4] bg-white flex items-center justify-between px-6">
        <div className="flex items-baseline gap-4">
          <Link
            to="/"
            className="text-sm font-semibold tracking-[0.15em] uppercase text-foreground hover:opacity-70"
          >
            Delta Carbon
          </Link>
          <span className="text-[10px] tracking-[0.14em] uppercase text-[#5bbfaa]">
            Design Evidence
          </span>
        </div>
        <span className="text-[11px] tracking-wider uppercase border border-[#e8e8e4] px-2 py-1 text-muted-foreground">
          Demo building — upfront carbon assessment
        </span>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-10 space-y-10">
        <div>
          <h1 className="text-2xl font-semibold text-[#1a1a1a]">
            Design Evidence
          </h1>
          <p className="text-sm text-[#6a6a66] mt-2 max-w-3xl">
            Material zones, supplier locality and upfront carbon delta for the demo building.
            Scope A1–A3, GFA basis.
          </p>
        </div>

        <Section label="01 · Material zones">
          <AxonometricPanel />
        </Section>

        <Section label="02 · Supplier locality">
          <SupplierMapPanel />
        </Section>

        <Section label="03 · Carbon delta">
          <CarbonDeltaPanel />
        </Section>
      </main>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div
        className="text-[9px] uppercase mb-3"
        style={{ color: "#5bbfaa", letterSpacing: "0.14em" }}
      >
        {label}
      </div>
      <div className="bg-white border border-[#e8e8e4] rounded-[10px] overflow-hidden">
        {children}
      </div>
    </section>
  );
}
