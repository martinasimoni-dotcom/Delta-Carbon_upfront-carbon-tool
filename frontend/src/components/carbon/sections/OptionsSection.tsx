import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useBuilding } from "@/state/building";
import type { ProjectOption } from "@/state/building";
import { downloadPassport } from "@/lib/passport";

function formatCO2(kg: number): string {
  const t = kg / 1000;
  return `${t.toLocaleString("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} t CO₂e`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function OptionCard({ option, onLoad, onDelete, onRename, onDownload }: {
  option: ProjectOption;
  onLoad: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onDownload: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(option.name);
  const isNegative = option.totalCo2Kg < 0;

  const commitRename = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== option.name) onRename(trimmed);
    setEditing(false);
  };

  return (
    <div className="border border-[#E5E7EB] rounded-sm bg-white p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setDraft(option.name); setEditing(false); } }}
              className="w-full text-xs font-semibold border-b border-[#1a4731] outline-none bg-transparent pb-0.5"
            />
          ) : (
            <p
              className="text-xs font-semibold text-foreground truncate cursor-pointer hover:text-[#1a4731]"
              onDoubleClick={() => { setDraft(option.name); setEditing(true); }}
              title="Double-click to rename"
            >
              {option.name}
            </p>
          )}
          <p
            className="text-[11px] font-medium tabular-nums mt-0.5"
            style={{ color: isNegative ? "#1a4731" : "#EF4444" }}
          >
            {formatCO2(option.totalCo2Kg)}
          </p>
          <p className="text-[10px] text-muted-foreground">{formatDate(option.createdAt)}</p>
        </div>
        <button
          onClick={() => { if (window.confirm(`Delete "${option.name}"?`)) onDelete(); }}
          className="shrink-0 p-1 text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEE2E2] rounded transition-colors"
          title="Delete option"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={onLoad}
          className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider border border-[#1a4731] text-[#1a4731] hover:bg-[#1a4731] hover:text-white transition-colors rounded-sm"
        >
          Load
        </button>
        <button
          onClick={onDownload}
          className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider border border-[#E5E7EB] text-[#6B7280] hover:border-[#1a4731] hover:text-[#1a4731] transition-colors rounded-sm"
          title="Download passport for this option"
        >
          Passport
        </button>
      </div>
    </div>
  );
}

export function OptionsSection() {
  const navigate = useNavigate();
  const projects = useBuilding((s) => s.projects);
  const currentProjectId = useBuilding((s) => s.currentProjectId);
  const saveOption = useBuilding((s) => s.saveOption);
  const loadOption = useBuilding((s) => s.loadOption);
  const deleteOption = useBuilding((s) => s.deleteOption);
  const renameOption = useBuilding((s) => s.renameOption);

  const project = currentProjectId ? projects.find((p) => p.id === currentProjectId) : null;
  const options: ProjectOption[] = project?.options ?? [];

  const [saving, setSaving] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const startSave = () => {
    setNameInput(`Option ${options.length + 1}`);
    setSaving(true);
  };

  const commitSave = () => {
    const trimmed = nameInput.trim();
    saveOption(trimmed || undefined);
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      {/* Save button / inline input */}
      {saving ? (
        <div className="flex gap-1.5">
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commitSave(); if (e.key === "Escape") setSaving(false); }}
            className="flex-1 text-xs border border-[#1a4731] px-2 py-1.5 outline-none rounded-sm"
            placeholder="Option name"
          />
          <button
            onClick={commitSave}
            className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white rounded-sm"
            style={{ backgroundColor: "#1a4731" }}
          >
            Save
          </button>
          <button
            onClick={() => setSaving(false)}
            className="px-2 py-1.5 text-[10px] text-[#6B7280] border border-[#E5E7EB] rounded-sm hover:bg-[#F9FAFB]"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={startSave}
          className="w-full py-2 text-[11px] font-semibold uppercase tracking-wider text-white rounded-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#1a4731" }}
        >
          + Save current as option
        </button>
      )}

      {/* Option cards */}
      {options.length > 0 && (
        <div className="space-y-2">
          {options.map((opt) => (
            <OptionCard
              key={opt.id}
              option={opt}
              onLoad={() => loadOption(opt.id)}
              onDelete={() => deleteOption(opt.id)}
              onRename={(name) => renameOption(opt.id, name)}
              onDownload={() => downloadPassport(opt)}
            />
          ))}
        </div>
      )}

      {options.length === 0 && (
        <p className="text-[11px] text-muted-foreground text-center py-2">
          No options saved yet
        </p>
      )}

      {/* Compare button */}
      {options.length >= 2 && (
        <button
          onClick={() => navigate({ to: "/compare" })}
          className="w-full py-2 text-[11px] font-semibold uppercase tracking-wider border border-[#E5E7EB] text-foreground hover:border-foreground transition-colors rounded-sm"
        >
          Compare Options →
        </button>
      )}
    </div>
  );
}
