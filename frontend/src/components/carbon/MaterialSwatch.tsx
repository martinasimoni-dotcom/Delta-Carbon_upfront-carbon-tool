import { swatchStyle } from "@/lib/swatches";
import { getMaterial } from "@/lib/materials";
import { cn } from "@/lib/utils";

export function MaterialSwatch({
  materialId,
  className,
}: {
  materialId: string;
  className?: string;
}) {
  const m = getMaterial(materialId);
  return (
    <div
      className={cn("rounded-sm border border-border", className)}
      style={swatchStyle(m)}
      aria-label={m.name}
      role="img"
    />
  );
}
