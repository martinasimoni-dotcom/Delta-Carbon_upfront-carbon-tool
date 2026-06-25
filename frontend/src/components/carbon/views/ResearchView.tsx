export function ResearchView() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-white">
      <div className="max-w-[800px] mx-auto px-10 py-12">

        {/* Header */}
        <div className="mb-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1a4731] mb-2">
            Delta Carbon
          </p>
          <h1 className="text-2xl font-semibold text-[#111111] mb-2">Research & Methodology</h1>
          <p className="text-[15px] text-[#555555] leading-relaxed">
            Upfront carbon assessment for architects at the massing stage
          </p>
        </div>

        <hr className="border-[#E5E7EB] mb-10" />

        {/* Section 1 — LCA */}
        <section className="mb-10">
          <SectionLabel>What is LCA?</SectionLabel>
          <p className="body-text mb-5">
            Life Cycle Assessment (LCA) is a methodology for evaluating the environmental impact of a
            product or building across its entire life — from raw material extraction to end of life.
            For buildings, LCA covers four main stages:
          </p>
          <ResearchTable
            headers={["Stage", "Code", "Description"]}
            rows={[
              ["Product", "A1–A3", "Raw material extraction, transport to manufacturer, manufacturing"],
              ["Construction", "A4–A5", "Transport to site, construction process"],
              ["Use", "B1–B7", "Maintenance, repair, replacement, operational energy"],
              ["End of Life", "C1–C4", "Demolition, transport, waste processing"],
              ["Beyond", "D", "Reuse, recovery, recycling potential"],
            ]}
          />
        </section>

        <hr className="border-[#E5E7EB] mb-10" />

        {/* Section 2 — Upfront Carbon */}
        <section className="mb-10">
          <SectionLabel>What is Upfront Carbon?</SectionLabel>
          <p className="body-text mb-4">
            Upfront carbon refers to the greenhouse gas emissions released before a building is
            occupied — primarily during the manufacturing of materials (A1–A3) and their transport
            to site (A4). Unlike operational carbon, upfront carbon is{" "}
            <strong className="text-[#111111]">
              locked in at the moment of construction
            </strong>{" "}
            and cannot be recovered through energy efficiency measures later.
          </p>
          <div className="grid grid-cols-2 gap-4 my-6">
            {[
              { stat: "39%", desc: "of global energy-related carbon emissions come from buildings", source: "Architecture 2030, RMI 2026" },
              { stat: "11%", desc: "is embodied carbon — emitted before the building is occupied", source: "Architecture 2030, RMI 2026" },
              { stat: "50%", desc: "of all new construction's lifetime emissions will be upfront carbon by 2050", source: "World Green Building Council, 2025" },
              { stat: "70%", desc: "of sustainability decisions are made during the early design phase", source: "Luo et al., Journal of Cleaner Production, 2025" },
            ].map(({ stat, desc, source }) => (
              <div key={stat} className="border border-[#E5E7EB] rounded-sm p-4">
                <p className="text-3xl font-bold text-[#1a4731] mb-1">{stat}</p>
                <p className="text-[13px] text-[#333333] leading-snug mb-1">{desc}</p>
                <p className="text-[11px] text-[#9CA3AF]">{source}</p>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-[#E5E7EB] mb-10" />

        {/* Section 3 — Scope */}
        <section className="mb-10">
          <SectionLabel>Delta Carbon Scope</SectionLabel>
          <p className="body-text mb-5">
            Delta Carbon focuses on the stages where design decisions have the most impact:
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-[#D1FAE5] bg-[#F0FDF4] rounded-sm p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1a4731] mb-3">
                ✅ In scope
              </p>
              {[
                ["A1", "Raw material supply"],
                ["A2", "Transport to manufacturer"],
                ["A3", "Manufacturing"],
                ["A4", "Transport to site (Google Routes API)"],
              ].map(([code, desc]) => (
                <div key={code} className="flex gap-2 mb-1.5">
                  <span className="text-[11px] font-mono font-semibold text-[#1a4731] w-6 shrink-0">{code}</span>
                  <span className="text-[12px] text-[#333333]">{desc}</span>
                </div>
              ))}
            </div>
            <div className="border border-[#E5E7EB] bg-[#FAFAFA] rounded-sm p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] mb-3">
                ❌ Out of scope (declared proactively)
              </p>
              {[
                ["A5", "Construction process"],
                ["B1–B7", "Use stage"],
                ["C1–C4", "End of life"],
                ["D", "Beyond building lifecycle"],
              ].map(([code, desc]) => (
                <div key={code} className="flex gap-2 mb-1.5">
                  <span className="text-[11px] font-mono font-semibold text-[#9CA3AF] w-8 shrink-0">{code}</span>
                  <span className="text-[12px] text-[#6B7280]">{desc}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[13px] text-[#555555] leading-relaxed mt-4">
            This scope is intentional: at the massing stage, A1–A4 are the only stages the
            architect can meaningfully influence through material selection and supplier choice.
          </p>
        </section>

        <hr className="border-[#E5E7EB] mb-10" />

        {/* Section 4 — Regenerative */}
        <section className="mb-10">
          <SectionLabel>The Regenerative Outcome</SectionLabel>
          <p className="body-text mb-5">
            Biogenic materials — timber, cross-laminated timber (CLT), straw — sequester carbon
            during their growth phase. When their A1–A3 embodied carbon coefficient is calculated
            on a net basis, they carry{" "}
            <strong className="text-[#111111]">negative values</strong>: they store more carbon
            than they emit during manufacturing.
          </p>
          <ResearchTable
            headers={["Material", "A1–A3 CO₂e/m³", "Effect"]}
            rows={[
              ["Structural steel", "+11,461 kg", "High emitter"],
              ["Concrete C30/37", "+312 kg", "Moderate emitter"],
              ["CLT", "−400 kg", "Carbon store"],
              ["Timber / Plywood", "−420 kg", "Carbon store"],
              ["Straw panels", "−120 kg", "Carbon store"],
            ]}
            highlightNegative
          />
          <p className="body-text mt-5">
            When a building uses primarily biogenic structural materials, Delta Carbon can produce a{" "}
            <strong className="text-[#1a4731]">negative total</strong> — a building that stores
            more carbon than its construction emits. This is the regenerative outcome.
          </p>
        </section>

        <hr className="border-[#E5E7EB] mb-10" />

        {/* Section 5 — Data Sources */}
        <section className="mb-10">
          <SectionLabel>Data Sources & Databases</SectionLabel>
          <ResearchTable
            headers={["Source", "What it provides", "Access"]}
            rows={[
              [
                "BEDEC / ITeC (Institut de Tecnologia de la Construcció de Catalunya)",
                "Primary carbon coefficient database. kg CO₂e per material unit (A1–A3). Spanish construction materials database.",
                "Via 2050-materials API",
              ],
              [
                "2050-materials API",
                "EPD aggregator — retrieves live verified EPD records from BEDEC/ITeC and other national databases. Used for AI material suggestions (RAG pipeline).",
                "app.2050-materials.com",
              ],
              [
                "CINARK / Royal Danish Academy",
                "Construction Materials Pyramid. ~60 materials with verified A1–A3 GWP values. Used as reference for biogenic material coefficients.",
                "materialepyramiden.dk",
              ],
              [
                "Architecture 2030 / RMI 2026",
                "Global statistics on building sector carbon emissions (39%, 11%, 28% breakdown).",
                "architecture2030.org",
              ],
              [
                "World Green Building Council 2025",
                "Upfront carbon projection (50% of lifetime emissions by 2050).",
                "worldgbc.org",
              ],
              [
                "Luo et al., Journal of Cleaner Production 2025",
                "70% of sustainability decisions made at early design stage.",
                "DOI: 10.1016/j.jclepro.2025.145854",
              ],
              [
                "Google Routes API",
                "Road distance calculation for A4 transport CO₂.",
                "Google Cloud Platform",
              ],
              [
                "EPBD Recast (EU Directive 2024/1275)",
                "European regulatory framework requiring whole-life carbon assessment for new buildings by 2030 (large buildings from 2028).",
                "EUR-Lex",
              ],
            ]}
          />
        </section>

        <hr className="border-[#E5E7EB] mb-10" />

        {/* Section 6 — Methodology */}
        <section className="mb-10">
          <SectionLabel>Calculation Methodology</SectionLabel>

          <p className="text-[12px] font-semibold uppercase tracking-wider text-[#1a4731] mb-2 mt-5">
            A1–A3 Manufacturing Carbon
          </p>
          <pre className="text-[13px] font-mono bg-[#F5F5F5] rounded px-4 py-3 mb-3 overflow-x-auto">
            CO₂ (kg) = Volume (m³) × Coefficient (kg CO₂e/m³)
          </pre>
          <p className="text-[13px] text-[#555555] leading-relaxed mb-6">
            Coefficients sourced from BEDEC/ITeC via 2050-materials API (country = ES). All values
            represent A1–A3 Global Warming Potential (GWP) in kg CO₂e per unit.
          </p>

          <p className="text-[12px] font-semibold uppercase tracking-wider text-[#1a4731] mb-2">
            A4 Transport Carbon
          </p>
          <pre className="text-[13px] font-mono bg-[#F5F5F5] rounded px-4 py-3 mb-3 overflow-x-auto">
            CO₂ (kg) = Distance (km) × Weight (tonnes) × 0.062 kg CO₂e/tonne-km
          </pre>
          <p className="text-[13px] text-[#555555] leading-relaxed mb-6">
            Distance calculated via Google Routes API (road freight, driving mode). Emission
            factor: 0.062 kg CO₂e per tonne-km — standard road freight HGV, widely used in
            European LCA practice.
          </p>

          <p className="text-[12px] font-semibold uppercase tracking-wider text-[#1a4731] mb-2">
            Benchmark
          </p>
          <p className="text-[13px] text-[#555555] leading-relaxed mb-6">
            280 kg CO₂e/m² gross floor area — European average for new construction (Architecture
            2030, RMI 2026).
          </p>

          <p className="text-[12px] font-semibold uppercase tracking-wider text-[#1a4731] mb-2">
            AI Material Suggestions — RAG Pipeline
          </p>
          <ol className="space-y-1.5 pl-1">
            {[
              "User selects an element",
              "Backend queries 2050-materials API for Spanish EPDs matching the element type",
              "Retrieved EPD records (verified GWP values) passed as context to Claude claude-sonnet-4-6",
              "LLM ranks alternatives by carbon impact, explains suitability, cites source",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-[13px] text-[#555555] leading-relaxed">
                <span className="text-[#1a4731] font-semibold shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <hr className="border-[#E5E7EB] mb-10" />

        {/* Section 7 — Regulatory */}
        <section className="mb-12">
          <SectionLabel>Regulatory Context</SectionLabel>
          <p className="body-text mb-5">
            The Energy Performance of Buildings Directive (EPBD) recast (EU Directive 2024/1275)
            makes whole-life carbon assessment mandatory across the European Union:
          </p>
          <ResearchTable
            headers={["Year", "Requirement"]}
            rows={[
              ["2026", "EPBD preparation — member states begin transposition"],
              ["2028", "Whole-life carbon mandatory for large new buildings"],
              ["2030", "Whole-life carbon mandatory for all new buildings"],
            ]}
          />
          <p className="body-text mt-5">
            Delta Carbon is designed to address the compliance gap at the design stage — the moment
            when material decisions are still open and upfront carbon can still be reduced.
          </p>
        </section>

        <hr className="border-[#E5E7EB] mb-10" />

        {/* Footer */}
        <footer className="text-center space-y-1 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1a4731]">
            Delta Carbon — Built at IAAC Barcelona
          </p>
          <p className="text-[12px] text-[#6B7280]">
            MaAI01 — AI for Regenerative Design — June 2026
          </p>
          <p className="text-[12px] text-[#9CA3AF]">
            Team: Bhavana Priya · Martina Simoni · Rashi Desadla · Rim Choufani
          </p>
          <p className="text-[12px] text-[#9CA3AF]">Supervisor: Prof. Emanuele Naboni</p>
        </footer>

      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1a4731] mb-3">
      {children}
    </p>
  );
}

function ResearchTable({
  headers,
  rows,
  highlightNegative = false,
}: {
  headers: string[];
  rows: string[][];
  highlightNegative?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-[#F9FAFB]">
            {headers.map((h) => (
              <th
                key={h}
                className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] border border-[#E5E7EB]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 1 ? "bg-[#F9FAFB]" : "bg-white"}>
              {row.map((cell, j) => {
                const isNegativeValue =
                  highlightNegative && j === 1 && cell.startsWith("−");
                const isPositiveValue =
                  highlightNegative && j === 1 && cell.startsWith("+");
                return (
                  <td
                    key={j}
                    className={`px-3 py-2 border border-[#E5E7EB] text-[#333333] leading-snug align-top ${
                      isNegativeValue
                        ? "text-[#1a4731] font-semibold"
                        : isPositiveValue
                        ? "text-[#9CA3AF]"
                        : ""
                    }`}
                  >
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
