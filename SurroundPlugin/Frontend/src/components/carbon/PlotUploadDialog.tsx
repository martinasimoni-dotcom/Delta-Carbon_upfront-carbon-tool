import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useBuilding } from "@/state/building";
import { Upload } from "lucide-react";

type Shape = "box" | "l" | "u";

export function PlotUploadDialog() {
  const open = useBuilding((s) => s.uploadOpen);
  const setOpen = useBuilding((s) => s.setUploadOpen);
  const loadModel = useBuilding((s) => s.loadModel);
  const setDims = useBuilding((s) => s.setDims);
  const clearModel = useBuilding((s) => s.clearModel);
  const placeBuilding = useBuilding((s) => s.placeBuilding);
  const selectedParcel = useBuilding((s) => s.selectedParcel);
  const inputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"upload" | "draw">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [width, setWidth] = useState(25);
  const [depth, setDepth] = useState(25);
  const [height, setHeight] = useState(60);
  const [shape, setShape] = useState<Shape>("box");

  const handleFile = (f: File) => {
    if (f.size > 50 * 1024 * 1024) {
      alert("File too large. Max 50 MB.");
      return;
    }
    const lower = f.name.toLowerCase();
    if (!/\.(obj|gltf|glb|ifc)$/.test(lower)) {
      alert("Unsupported format. Use .obj, .gltf, .glb or .ifc");
      return;
    }
    setFile(f);
  };

  const onUpload = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".gltf") || lower.endsWith(".glb")) loadModel(url, "gltf", file.name);
    else if (lower.endsWith(".obj")) loadModel(url, "obj", file.name);
    else {
      alert("IFC parsing coming soon. Use .obj, .gltf or .glb for now.");
      return;
    }
    if (selectedParcel?.plotCoords?.length) placeBuilding();
    setFile(null);
  };

  const onCreateMassing = () => {
    clearModel();
    setDims({ width, depth, height });
    if (selectedParcel?.plotCoords?.length) {
      placeBuilding();
    }
    setOpen(false);
  };

  const volume = width * depth * height;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] rounded-md">
        <DialogHeader>
          <DialogTitle className="text-xs uppercase tracking-[0.15em]">Add Building to Plot</DialogTitle>
          <DialogDescription className="font-mono text-[11px]">
            41.4134°N, 2.2108°E · 50 × 50 m
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "upload" | "draw")} className="w-full">
          <TabsList className="grid grid-cols-2 w-full rounded-sm">
            <TabsTrigger value="upload" className="rounded-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Upload Model
            </TabsTrigger>
            <TabsTrigger value="draw" className="rounded-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Draw Massing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 pt-4">
            <input
              ref={inputRef}
              type="file"
              accept=".obj,.gltf,.glb,.ifc"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full border border-dashed border-border rounded-sm p-8 text-center hover:border-primary hover:bg-muted/40 transition-colors"
            >
              <Upload className="size-6 mx-auto mb-2 text-primary" />
              <div className="text-sm">{file ? file.name : "Drag & drop or click to upload"}</div>
              <div className="text-[11px] text-muted-foreground mt-1">.obj · .gltf · .glb · .ifc</div>
            </button>

            <div className="text-[11px] text-muted-foreground space-y-0.5">
              <div>Supported formats:</div>
              <div>• OBJ (Wavefront)</div>
              <div>• GLTF / GLB (Khronos)</div>
              <div>• IFC (Industry Foundation Classes — preview)</div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={onUpload} disabled={!file}>Upload</Button>
            </div>
          </TabsContent>

          <TabsContent value="draw" className="space-y-4 pt-4">
            <div className="space-y-3">
              <DimSlider label="Width" value={width} min={5} max={50} onChange={setWidth} />
              <DimSlider label="Depth" value={depth} min={5} max={50} onChange={setDepth} />
              <DimSlider label="Height" value={height} min={10} max={150} onChange={setHeight} />
            </div>

            <div className="border border-border rounded-sm p-4 bg-muted/30">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Preview</div>
              <div className="flex items-end justify-center h-24">
                <div
                  className="bg-background border border-foreground/40 shadow-sm"
                  style={{
                    width: `${(width / 50) * 60}px`,
                    height: `${(height / 150) * 90}px`,
                  }}
                />
              </div>
              <div className="font-mono text-[11px] text-center mt-2">
                {width} × {depth} × {height} m
              </div>
              <div className="font-mono text-[11px] text-center text-muted-foreground">
                Volume: {volume.toLocaleString()} m³
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Shape</div>
              <div className="flex gap-2">
                {(["box", "l", "u"] as Shape[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setShape(s)}
                    disabled={s !== "box"}
                    className={`flex-1 px-3 py-1.5 text-xs border rounded-sm transition-colors ${
                      shape === s
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary disabled:opacity-40 disabled:hover:border-border"
                    }`}
                  >
                    {s === "box" ? "Box" : s === "l" ? "L-Shape" : "U-Shape"}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">L/U shapes coming soon</div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={onCreateMassing}>Create Massing</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function DimSlider({
  label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{value} m</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}
