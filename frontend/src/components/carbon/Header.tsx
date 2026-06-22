import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useBuilding } from "@/state/building";

export function Header() {
  const navigate = useNavigate();
  const plotCenter = useBuilding((s) => s.plotCenter);
  const currentProjectId = useBuilding((s) => s.currentProjectId);
  const projects = useBuilding((s) => s.projects);
  const setCreateProjectModalOpen = useBuilding((s) => s.setCreateProjectModalOpen);
  const user = useBuilding((s) => s.user);
  const logout = useBuilding((s) => s.logout);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const currentProject = currentProjectId ? projects.find((p) => p.id === currentProjectId) : null;

  const coordStr = plotCenter
    ? `${Math.abs(plotCenter.lat).toFixed(4)}° ${plotCenter.lat >= 0 ? "N" : "S"}, ${Math.abs(plotCenter.lon).toFixed(4)}° ${plotCenter.lon >= 0 ? "E" : "W"}`
    : null;

  return (
    <header className="h-[60px] border-b border-border bg-background flex items-center justify-between px-6">
      <div className="flex items-baseline gap-2">
        <Link to="/dashboard" className="text-sm font-semibold tracking-[0.15em] uppercase text-foreground hover:opacity-70 transition-opacity">
          Delta Carbon
        </Link>
        {currentProject && (
          <>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm text-muted-foreground truncate max-w-[200px]" title={currentProject.name}>
              {currentProject.name}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {coordStr && (
          <span className="text-[11px] tracking-wider uppercase border border-border px-2 py-1 text-muted-foreground">
            {coordStr}
          </span>
        )}
        <button
          onClick={() => setCreateProjectModalOpen(true)}
          className="text-[11px] tracking-wider uppercase border border-border px-3 py-1 text-foreground hover:border-foreground transition-colors"
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
              {user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </button>
            {avatarOpen && (
              <div className="absolute right-0 top-9 z-50 bg-white border border-border rounded-sm shadow-md min-w-[140px] py-1">
                <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border">{user.email}</div>
                <button
                  onClick={() => { logout(); navigate({ to: "/login" }); setAvatarOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted/50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
