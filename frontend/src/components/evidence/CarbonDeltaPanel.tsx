import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

// TODO: replace with demo building actual before/after figures
const BASELINE_COLOR = "#E05540";
const DELTA_CARBON_COLOR = "#1A9E75";

const intensityData = [
  { name: "Baseline", value: 0, fill: BASELINE_COLOR },
  { name: "Delta Carbon", value: 0, fill: DELTA_CARBON_COLOR },
];

const totalData = [
  { name: "Baseline", value: 0, fill: BASELINE_COLOR },
  { name: "Delta Carbon", value: 0, fill: DELTA_CARBON_COLOR },
];

export function CarbonDeltaPanel() {
  return (
    <div className="p-6">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
        <div className="text-[13px] font-medium text-[#1a1a1a]">
          Delta Carbon — material substitution delta
        </div>
        <div className="text-[11px] text-[#6a6a66]">
          Upfront carbon A1–A3 · GFA basis
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <ChartCard
          title="Intensity"
          unit="kg CO₂e / m² GFA"
          data={intensityData}
          delta="—"
        />
        <ChartCard
          title="Total"
          unit="t CO₂e"
          data={totalData}
          delta="—"
        />
      </div>

      <div
        className="mt-6 border border-dashed rounded-[8px] px-4 py-3 flex flex-wrap items-center justify-between gap-3"
        style={{ borderColor: "#1A9E75", background: "#1A9E7508" }}
      >
        <div>
          <div className="text-[18px] font-semibold text-[#1A9E75]">
            Demo building figures pending
          </div>
          <div className="text-[11px] text-[#6a6a66]">
            Run SurroundSync on the demo building to populate before/after data
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  unit,
  data,
  delta,
}: {
  title: string;
  unit: string;
  data: { name: string; value: number; fill: string }[];
  delta: string;
}) {
  return (
    <div className="border border-[#e8e8e4] rounded-[8px] p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[11px] uppercase tracking-wider text-[#6a6a66]">
          {title}
        </div>
        <div className="text-[11px] text-[#6a6a66]">{unit}</div>
      </div>

      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 60, bottom: 10, left: 80 }}
          >
            <CartesianGrid horizontal={false} stroke="#eeece6" />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "#6a6a66" }}
              stroke="#cccac4"
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "#1a1a1a" }}
              stroke="#cccac4"
              width={80}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                style={{ fontSize: 11, fill: "#1a1a1a", fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-right text-[11px] font-medium" style={{ color: DELTA_CARBON_COLOR }}>
        Δ {delta}
      </div>
    </div>
  );
}
