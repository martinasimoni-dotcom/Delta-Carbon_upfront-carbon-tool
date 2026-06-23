import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useBuilding } from "@/state/building";
import type { ProjectOption } from "@/state/building";
import { getMaterial } from "@/lib/materials";
import { downloadPassport } from "@/lib/passport";

const OPTION_COLORS = ["#1a4731", "#4ADE80", "#EF4444", "#EAB308", "#3B82F6"];
const KINDS = ["foundation", "structure", "envelope", "floors", "roof"] as const;

function formatCO2(kg: number) {
  const t = kg / 1000;
  return `${t.toLocaleString("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} t CO₂e`;
}

function elementCO2forOption(opt: ProjectOption, kind: string): number {
  const el = opt.elements.find((e) => e.kind === kind);
  if (!el) return 0;
  return el.volumeM3 * getMaterial(el.materialId).co2PerM3;
}

function RenderPanel({ option, buildingUse, location }: {
  option: ProjectOption;
  buildingUse: string;
  location: string;
}) {
  const setOptionRender = useBuilding((s) => s.setOptionRender);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/v1/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          option_name: option.name,
          building_use: buildingUse,
          location,
          elements: option.elements.map((e) => ({ type: e.kind, material: getMaterial(e.materialId).name })),
          total_co2_kg: option.totalCo2Kg,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { detail?: string }).detail ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { image_url: string };
      setOptionRender(option.id, data.image_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Render failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="border border-[#E5E7EB] rounded-lg overflow-hidden bg-white flex flex-col">
      <div className="relative bg-[#F5F5F5] aspect-video flex items-center justify-center">
        {option.renderUrl ? (
          <>
            <img src={option.renderUrl} alt={option.name} className="w-full h-full object-cover" />
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="absolute bottom-2 right-2 text-[9px] uppercase tracking-wider bg-black/50 text-white px-2 py-1 rounded hover:bg-black/70 transition-colors"
            >
              {generating ? "…" : "Regenerate"}
            </button>
          </>
        ) : generating ? (
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <div className="w-6 h-6 border-2 border-[#1a4731] border-t-transparent rounded-full animate-spin" />
            <p className="text-[11px] text-muted-foreground">Generating architectural render with DALL-E 3…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="1" />
              <path d="M9 22V12h6v10" /><path d="M3 9h18" />
            </svg>
            <button
              onClick={handleGenerate}
              className="text-[11px] font-semibold uppercase tracking-wider text-white px-4 py-2 rounded-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: "#1a4731" }}
            >
              Generate render
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-[10px] text-[#EF4444] px-3 pt-2">{error}</p>}
      <div className="p-3">
        <p className="text-sm font-semibold text-foreground">{option.name}</p>
        <p className="text-xs font-medium tabular-nums" style={{ color: option.totalCo2Kg < 0 ? "#1a4731" : "#EF4444" }}>
          {formatCO2(option.totalCo2Kg)}
        </p>
      </div>
    </div>
  );
}

export function CompareView() {
  const projects = useBuilding((s) => s.projects);
  const currentProjectId = useBuilding((s) => s.currentProjectId);
  const project = projects.find((p) => p.id === currentProjectId);
  const options: ProjectOption[] = project?.options ?? [];
  const [downloading, setDownloading] = useState(false);

  if (options.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="18" /><rect x="14" y="3" width="7" height="18" />
        </svg>
        <p className="text-sm font-medium text-foreground">No options to compare yet</p>
        <p className="text-[11px] text-[#6B7280]">Save at least 2 options from the 3D Model tab using "Save Option" in section 08.</p>
      </div>
    );
  }

  const minCo2 = Math.min(...options.map((o) => o.totalCo2Kg));
  const baseline = options[0]?.totalCo2Kg ?? 0;

  const chartData = [
    ...KINDS.map((kind) => ({
      element: kind.charAt(0).toUpperCase() + kind.slice(1),
      ...options.reduce<Record<string, number>>((acc, opt) => {
        acc[opt.name] = elementCO2forOption(opt, kind);
        return acc;
      }, {}),
    })),
    {
      element: "Transport (A4)",
      ...options.reduce<Record<string, number>>((acc, opt) => {
        acc[opt.name] = opt.transportCo2Kg;
        return acc;
      }, {}),
    },
  ];

  const handleDownloadAll = async () => {
    setDownloading(true);
    for (let i = 0; i < options.length; i++) {
      await downloadPassport(options[i]);
      if (i < options.length - 1) await new Promise((r) => setTimeout(r, 500));
    }
    setDownloading(false);
  };

  return (
    <div className="overflow-y-auto h-full px-8 py-8 max-w-[1200px] w-full mx-auto space-y-10">
      {/* Visual comparison */}
      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
          Visual Comparison
        </h2>
        <div className={`grid gap-5 ${options.length === 2 ? "grid-cols-2" : options.length === 3 ? "grid-cols-3" : "grid-cols-[repeat(auto-fill,minmax(280px,1fr))]"}`}>
          {options.map((opt) => (
            <div key={opt.id} className="space-y-2">
              <RenderPanel
                option={opt}
                buildingUse={project?.buildingUse ?? "Office"}
                location={project?.location ?? "Barcelona, Spain"}
              />
              <div className="flex gap-1.5 flex-wrap">
                {opt.totalCo2Kg < 0 && (
                  <span className="text-[9px] uppercase tracking-wider bg-[#E8F5E9] text-[#1a4731] px-1.5 py-0.5 rounded-sm font-medium">
                    Regenerative ✓
                  </span>
                )}
                {opt.totalCo2Kg === minCo2 && options.length > 1 && (
                  <span className="text-[9px] uppercase tracking-wider bg-[#F0FDF4] text-[#1a4731] border border-[#bbf7d0] px-1.5 py-0.5 rounded-sm font-medium">
                    Lowest carbon
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Chart */}
      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
          Carbon Comparison by Element
        </h2>
        <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="element" tick={{ fontSize: 11, fill: "#6B7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}t`} />
              <Tooltip
                formatter={(value, name) => [`${(Number(value ?? 0) / 1000).toFixed(1)} t CO₂e`, String(name)]}
                contentStyle={{ fontSize: 11, borderRadius: 4 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {options.map((opt, i) => (
                <Bar key={opt.id} dataKey={opt.name} fill={OPTION_COLORS[i % OPTION_COLORS.length]} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Summary table */}
      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
          Summary
        </h2>
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th className="text-left px-5 py-3 font-semibold text-[#6B7280] uppercase tracking-wider text-[10px]">Option</th>
                <th className="text-right px-5 py-3 font-semibold text-[#6B7280] uppercase tracking-wider text-[10px]">Total CO₂</th>
                <th className="text-right px-5 py-3 font-semibold text-[#6B7280] uppercase tracking-wider text-[10px]">vs baseline</th>
                <th className="text-center px-5 py-3 font-semibold text-[#6B7280] uppercase tracking-wider text-[10px]">Regenerative?</th>
              </tr>
            </thead>
            <tbody>
              {options.map((opt, i) => {
                const delta = opt.totalCo2Kg - baseline;
                const isLowest = opt.totalCo2Kg === minCo2;
                return (
                  <tr key={opt.id} className="border-b border-[#E5E7EB] last:border-b-0">
                    <td className="px-5 py-3.5 font-medium text-foreground">
                      {opt.name}
                      {isLowest && <span className="ml-2 text-[9px] text-[#1a4731] font-semibold">★ lowest</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-medium" style={{ color: opt.totalCo2Kg < 0 ? "#1a4731" : "#111" }}>
                      {formatCO2(opt.totalCo2Kg)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-muted-foreground">
                      {i === 0 ? "—" : (
                        <span style={{ color: delta < 0 ? "#1a4731" : "#EF4444" }}>
                          {delta < 0 ? "" : "+"}{formatCO2(delta)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {opt.totalCo2Kg < 0
                        ? <span className="text-[#1a4731] font-semibold">Yes ✓</span>
                        : <span className="text-muted-foreground">No</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="pb-8">
        <button
          onClick={handleDownloadAll}
          disabled={downloading}
          className="w-full py-3 text-[11px] font-semibold uppercase tracking-wider text-white rounded-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: "#1a4731" }}
        >
          {downloading ? "Generating PDFs…" : `Download all passports (${options.length})`}
        </button>
      </div>
    </div>
  );
}
