# SURROUND Upfront Carbon — Requirements

## System Requirements

| Requirement | Minimum | Tested |
|---|---|---|
| OS | Windows 10 (64-bit) | Windows 11 Pro |
| Rhino | Rhino 7 (Windows) | Rhino 8 |
| .NET Framework | 4.8 | 4.8 |
| RAM | 8 GB | 16 GB |
| Disk | 500 MB free | — |

> Mac OS is not supported. Rhino for Mac uses a different UI framework and is out of scope for v1.

---

## Rhino Plugin (C#)

### Build Tools

| Tool | Version | Notes |
|---|---|---|
| .NET SDK | 6.0 or later | For `dotnet build` (targets net48) |
| MSBuild | via .NET SDK | Included with .NET SDK |
| Visual Studio | 2022 (optional) | Can use `dotnet` CLI instead |

Install .NET SDK: https://dotnet.microsoft.com/download

### Rhino SDK References

These DLLs are resolved automatically from `C:\Program Files\Rhino 8\System\` (or override via `RhinoInstallPath` env var). They are **not** bundled with the build output — they are shipped with Rhino.

| DLL | Purpose |
|---|---|
| `RhinoCommon.dll` | Core Rhino geometry + document API |
| `Rhino.UI.dll` | Rhino UI panels and dialogs |
| `Eto.dll` | Cross-platform UI toolkit (used by Rhino.UI) |
| `Newtonsoft.Json.Rhino.dll` | JSON serialisation (bundled with Rhino 7/8) |

### NuGet / Additional References

No NuGet packages are required. All dependencies are either part of .NET Framework 4.8 or bundled with Rhino:

| Assembly | Source |
|---|---|
| `System.Net.Http` | .NET Framework 4.8 |
| `System.Drawing` | .NET Framework 4.8 |
| `System.Windows.Forms` | .NET Framework 4.8 |

### Building the Plugin

```powershell
cd SurroundPlugin
dotnet build -c Debug    # → bin\Debug\net48\SurroundPlugin.rhp
dotnet build -c Release  # → bin\Release\net48\SurroundPlugin.rhp
```

> **Important:** Rhino must be closed before rebuilding. Rhino holds the `.rhp` file open while the plugin is loaded.

### Loading into Rhino

Drag and drop `SurroundPlugin.rhp` onto the Rhino viewport. No admin rights required.

---

## Frontend (React / TypeScript)

### Runtime

| Tool | Version | Install |
|---|---|---|
| Bun | 1.x (latest) | https://bun.sh |
| Node.js | 18+ (fallback) | https://nodejs.org |

Bun is the preferred runtime. Install on Windows:

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

### Install Dependencies

```powershell
cd SurroundPlugin\Frontend
bun install
```

### Start Dev Server

```powershell
bun run dev
```

Runs at `http://localhost:8080` (Vite dev server with custom Node.js bridge middleware).

### Key Frontend Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19 | UI framework |
| `@tanstack/react-start` | ^1.167 | SSR framework |
| `@tanstack/react-router` | ^1.168 | File-based routing |
| `mapbox-gl` | ^3 | Interactive 3D map |
| `zustand` | ^5 | Global state management |
| `vite` | ^7 | Dev server + bundler |
| `@cloudflare/vite-plugin` | ^1 | Cloudflare Workers target |
| `tailwindcss` | ^4 | Utility CSS |
| `recharts` | ^3 | Carbon charts |
| `jspdf` | ^4 | PDF export |

### Environment / API Keys

The Mapbox token is hardcoded in `MapView.tsx` and `MapInfoSection.tsx` (public token, safe to commit).

No `.env` file is required for local development. The Rhino–web bridge runs entirely on `localhost:8080` via Vite middleware — no external API needed for the sync workflow.

### Windows Credential Manager (Rhino Plugin URL)

The plugin reads its target URL from Windows Credential Manager at startup:

```powershell
cmdkey /generic:SurroundPlugin_URL /user:surround /pass:http://localhost:8080
```

This must be set once per machine. Without it, the plugin falls back to the Railway deployment URL.

---

## Repository Structure

```
SURROUND_UPFRONT-CARBON/
├── SurroundPlugin/
│   ├── Commands/
│   │   ├── SurroundAnalyze.cs      Extract geometry + send to API
│   │   ├── SurroundExport.cs       Export Material Passport PDF
│   │   ├── SurroundMaterials.cs    Open material picker
│   │   ├── SurroundSetOrigin.cs    Set Rhino EarthAnchorPoint from web plot
│   │   └── SurroundSync.cs         Sync Rhino model to web interface
│   ├── Core/
│   │   ├── APIClient.cs            HTTP client (posts to localhost:8080)
│   │   ├── CarbonCalculator.cs     Local EPD-based carbon calculation
│   │   ├── GeometryAnalyzer.cs     Layer extraction + volume computation
│   │   └── MaterialDatabase.cs     Cached EPD coefficients
│   ├── Models/                     C# data models (BuildingData, etc.)
│   ├── UI/                         WPF docked panel + dialogs
│   ├── Properties/AssemblyInfo.cs  Plugin GUID (required by Rhino)
│   ├── SurroundPlugin.cs           Plugin entry point
│   └── SurroundPlugin.csproj       SDK-style .NET project (net48, x64)
│
├── SurroundPlugin/Frontend/
│   ├── src/
│   │   ├── components/carbon/      Map, sidebar, section components
│   │   ├── state/building.ts       Zustand store (dims, elements, location)
│   │   ├── routes/index.tsx        Main page (Rhino poll + plot broadcast hooks)
│   │   └── routes/api/             TanStack Start server routes
│   ├── vite.config.ts              Rhino bridge middleware (rhinoBridge plugin)
│   ├── package.json
│   └── bun.lock
│
├── PRD.md                          Product Requirements Document
├── REQUIREMENTS.md                 This file
└── README.md                       Setup + workflow guide
```
