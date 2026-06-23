import { useRef, useState } from "react";

export function ImportOBJButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/model/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".obj"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="text-[10px] font-medium uppercase tracking-wider border border-[#E5E7EB] text-[#6B7280] px-2.5 py-1 rounded-sm hover:border-[#1a4731] hover:text-[#1a4731] transition-colors disabled:opacity-50"
      >
        {loading ? "Uploading…" : "Import OBJ"}
      </button>
      {error && <span className="text-[9px] text-red-500">{error}</span>}
    </div>
  );
}
