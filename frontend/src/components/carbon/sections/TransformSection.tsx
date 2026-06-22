import { useBuilding } from "@/state/building";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export function TransformSection() {
  const modelUrl = useBuilding((s) => s.modelUrl);
  const transform = useBuilding((s) => s.transform);
  const setTransform = useBuilding((s) => s.setTransform);
  const resetTransform = useBuilding((s) => s.resetTransform);
  const modelSize = useBuilding((s) => s.modelSize);

  if (!modelUrl) {
    return (
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Upload a model to enable scale, rotation, and position controls on the plot.
      </p>
    );
  }

  const scaled = modelSize
    ? `${(modelSize.x * transform.scale).toFixed(1)} × ${(modelSize.z * transform.scale).toFixed(1)} × ${(modelSize.y * transform.scale).toFixed(1)} m`
    : "—";

  return (
    <div className="space-y-4">
      <Ctrl label="Scale" value={`${transform.scale.toFixed(2)}×`}>
        <Slider
          value={[transform.scale]}
          min={0.1}
          max={5}
          step={0.05}
          onValueChange={(v) => setTransform({ scale: v[0] })}
        />
        <p className="text-[10px] text-muted-foreground mt-1 font-mono">Size: {scaled}</p>
      </Ctrl>

      <Ctrl label="Rotation" value={`${Math.round(transform.rotationY)}°`}>
        <Slider
          value={[transform.rotationY]}
          min={0}
          max={360}
          step={1}
          onValueChange={(v) => setTransform({ rotationY: v[0] })}
        />
      </Ctrl>

      <Ctrl label="Position X" value={`${transform.x.toFixed(1)} m`}>
        <Slider
          value={[transform.x]}
          min={-25}
          max={25}
          step={0.5}
          onValueChange={(v) => setTransform({ x: v[0] })}
        />
      </Ctrl>

      <Ctrl label="Position Y" value={`${transform.z.toFixed(1)} m`}>
        <Slider
          value={[transform.z]}
          min={-25}
          max={25}
          step={0.5}
          onValueChange={(v) => setTransform({ z: v[0] })}
        />
      </Ctrl>

      <Button variant="outline" size="sm" className="w-full rounded-sm font-normal" onClick={resetTransform}>
        Reset transform
      </Button>
    </div>
  );
}

function Ctrl({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-muted-foreground uppercase tracking-wider text-[10px]">{label}</span>
        <span className="text-foreground tabular-nums font-mono text-[11px]">{value}</span>
      </div>
      {children}
    </div>
  );
}
