import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useBuilding } from "@/state/building";
import { totalCO2kg } from "@/lib/carbon";
import { CreateProjectModal } from "@/components/carbon/CreateProjectModal";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    const { isLoggedIn } = useBuilding.getState();
    if (!isLoggedIn) throw redirect({ to: "/login" });
  },
  component: Dashboard,
  head: () => ({
    meta: [{ title: "Delta Carbon — Projects" }],
  }),
});

function formatCO2(kg: number): string {
  const t = kg / 1000;
  return `${t.toLocaleString("en-US", { maximumFractionDigits: 0 })} t CO₂e`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function BuildingIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9CA3AF"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <path d="M9 22V12h6v10" />
      <path d="M3 9h18" />
    </svg>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const projects = useBuilding((s) => s.projects);
  const setCurrentProject = useBuilding((s) => s.setCurrentProject);
  const deleteProject = useBuilding((s) => s.deleteProject);
  const currentProjectId = useBuilding((s) => s.currentProjectId);
  const setCreateProjectModalOpen = useBuilding((s) => s.setCreateProjectModalOpen);
  const user = useBuilding((s) => s.user);
  const logout = useBuilding((s) => s.logout);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const handleOpen = (id: string) => {
    setCurrentProject(id);
    navigate({ to: "/" });
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    deleteProject(id);
    // if it was current, stay on dashboard — store already nulls currentProjectId
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Header */}
      <header className="h-[60px] border-b border-[#E5E7EB] bg-white flex items-center justify-between px-8">
        <span className="text-sm font-semibold tracking-[0.15em] uppercase text-foreground">
          Delta Carbon
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreateProjectModalOpen(true)}
            className="text-[11px] tracking-wider uppercase border border-[#E5E7EB] px-3 py-1 text-foreground hover:border-foreground transition-colors"
          >
            New Project
          </button>
          {user && (
            <div className="relative">
              <button
                onClick={() => setAvatarOpen((v) => !v)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ backgroundColor: "#1a4731" }}
                title={user.name}
              >
                {user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
              </button>
              {avatarOpen && (
                <div className="absolute right-0 top-9 z-50 bg-white border border-[#E5E7EB] rounded-sm shadow-md min-w-[140px] py-1">
                  <div className="px-3 py-1.5 text-[10px] text-[#6B7280] border-b border-[#E5E7EB]">{user.email}</div>
                  <button
                    onClick={() => { logout(); navigate({ to: "/login" }); setAvatarOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-[#F9FAFB]"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-8 py-10 max-w-[1200px] w-full mx-auto">
        <h2 className="text-base font-semibold text-foreground mb-6 tracking-wide">
          Your Projects
        </h2>

        {projects.length === 0 ? (
          <EmptyState onNew={() => setCreateProjectModalOpen(true)} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
            {projects.map((p) => {
              const options = p.options ?? [];
              const bestCo2Kg = options.length > 0
                ? Math.min(...options.map((o) => o.totalCo2Kg))
                : totalCO2kg(p.elements, p.transportCo2Kg);
              const co2Kg = bestCo2Kg;
              const isRegenerative = options.some((o) => o.totalCo2Kg < 0);
              const isCurrent = p.id === currentProjectId;
              return (
                <div
                  key={p.id}
                  className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden flex flex-col hover:shadow-md transition-shadow group relative"
                >
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    title="Delete project"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#FEE2E2] text-[#9CA3AF] hover:text-[#EF4444]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>

                  {/* Thumbnail */}
                  <div className="h-[120px] bg-[#F5F5F5] flex items-center justify-center shrink-0">
                    <BuildingIcon />
                  </div>

                  {/* Card body */}
                  <div className="p-4 flex flex-col gap-1 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-semibold text-foreground leading-tight truncate">{p.name}</p>
                      {isCurrent && (
                        <span className="shrink-0 text-[9px] uppercase tracking-wider bg-[#E8F5E9] text-[#1a4731] px-1.5 py-0.5 rounded-sm font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{p.location}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs font-medium tabular-nums" style={{ color: co2Kg < 0 ? "#1a4731" : "inherit" }}>
                        {formatCO2(co2Kg)}
                      </p>
                      {isRegenerative && (
                        <span className="text-[9px] uppercase tracking-wider bg-[#E8F5E9] text-[#1a4731] px-1.5 py-0.5 rounded-sm font-medium">
                          Regenerative
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {p.buildingUse}
                      {p.gfa > 0 ? ` · ${p.gfa.toLocaleString()} m²` : ""}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {options.length > 0 ? `${options.length} option${options.length > 1 ? "s" : ""} saved` : "No options saved"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-auto pt-2">
                      Updated {formatDate(p.updatedAt)}
                    </p>
                  </div>

                  {/* Open button */}
                  <button
                    onClick={() => handleOpen(p.id)}
                    className="w-full py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white transition hover:opacity-90"
                    style={{ backgroundColor: "#1a4731" }}
                  >
                    Open
                  </button>
                </div>
              );
            })}

            {/* New Project card */}
            <button
              onClick={() => setCreateProjectModalOpen(true)}
              className="min-h-[260px] bg-[#F5F5F5] border-2 border-dashed border-[#D1D5DB] rounded-lg flex flex-col items-center justify-center gap-2 text-[#9CA3AF] hover:border-[#6B7280] hover:text-[#6B7280] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="text-xs font-medium">New Project</span>
            </button>
          </div>
        )}
      </main>

      <CreateProjectModal />
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center">
        <BuildingIcon />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">No projects yet</p>
        <p className="text-xs text-muted-foreground mt-1">Create your first project to get started</p>
      </div>
      <button
        onClick={onNew}
        className="mt-2 rounded-sm px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:opacity-90"
        style={{ backgroundColor: "#1a4731" }}
      >
        Create Project
      </button>
    </div>
  );
}
