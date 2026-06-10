import { useRef } from "react";
import { useBuilding } from "@/state/building";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export function ImportSection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const dims = useBuilding((s) => s.dims);
  const setDims = useBuilding((s) => s.setDims);
  const loadModel = useBuilding((s) => s.loadModel);
  const clearModel = useBuilding((s) => s.clearModel);
  const modelUrl = useBuilding((s) => s.modelUrl);

  const handleFile = (f: File) => {
    const url = URL.createObjectURL(f);
    const lower = f.name.toLowerCase();
    if (lower.endsWith(".gltf") || lower.endsWith(".glb")) loadModel(url, "gltf", f.name);
    else if (lower.endsWith(".obj")) loadModel(url, "obj", f.name);
    else alert("Unsupported file. Use .obj, .gltf or .glb (.ifc coming soon).");
  };

  return (
    <div className="space-y-4">
      <div>
        <input
          ref={inputRef}
          type="file"
          accept=".obj,.gltf,.glb"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button
          variant="outline"
          className="w-full justify-start rounded-sm font-normal"
          onClick={() => inputRef.current?.click()}
        >
          Upload model (.obj, .gltf)
        </Button>
        {modelUrl && (
          <button
            className="mt-2 text-[11px] text-muted-foreground hover:text-foreground underline"
            onClick={clearModel}
          >
            Remove uploaded model
          </button>
        )}
        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          IFC support coming soon
        </p>
      </div>

      {!modelUrl && (
        <div className="space-y-3 pt-3 border-t border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Or simple massing
          </p>
          <DimSlider label="Width" value={dims.width} min={5} max={80} onChange={(v) => setDims({ width: v })} />
          <DimSlider label="Depth" value={dims.depth} min={5} max={80} onChange={(v) => setDims({ depth: v })} />
          <DimSlider label="Height" value={dims.height} min={3} max={150} onChange={(v) => setDims({ height: v })} />
        </div>
      )}
    </div>
  );
}

function DimSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground tabular-nums">{value} m</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}
