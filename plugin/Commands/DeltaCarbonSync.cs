using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Rhino;
using Rhino.Commands;
using DeltaCarbon.Models;

namespace DeltaCarbon.Commands
{
    /// <summary>
    /// "DeltaCarbonSync" — reads the plot selected in the web interface, then sends
    /// current Rhino geometry to that location. Run after selecting a plot in the browser.
    /// </summary>
    public class DeltaCarbonSync : Command
    {
        public override string EnglishName => "DeltaCarbonSync";

        protected override Result RunCommand(RhinoDoc doc, RunMode mode)
        {
            try { RunAsync(doc).GetAwaiter().GetResult(); }
            catch (Exception ex) { RhinoApp.WriteLine($"DELTA CARBON: Sync error: {ex.Message}"); }
            return Result.Success;
        }

        private async Task RunAsync(RhinoDoc doc)
        {
            RhinoApp.WriteLine("DELTA CARBON: Syncing to web interface...");

            var analyzer = new Core.GeometryAnalyzer();
            var buildingData = analyzer.Analyze(doc);

            if (buildingData == null || buildingData.Elements.Count == 0)
            {
                RhinoApp.WriteLine("DELTA CARBON: No Brep geometry found. " +
                                   "Add 3D objects to named layers (Structure, Envelope, etc.) and run again.");
                return;
            }

            // ── Step 1: read selected plot from web interface ─────────────────────
            var webPlot = await ReadSelectedPlotAsync().ConfigureAwait(false);
            if (webPlot != null)
            {
                buildingData.Location = webPlot;
                RhinoApp.WriteLine($"DELTA CARBON: Using plot selected in browser — {webPlot}");
            }
            else if (buildingData.Location != null)
            {
                RhinoApp.WriteLine($"DELTA CARBON: No plot selected in browser — using Rhino EarthAnchorPoint {buildingData.Location}");
            }
            else
            {
                buildingData.Location = new Location { Lat = 41.3997, Lon = 2.1888 };
                RhinoApp.WriteLine("DELTA CARBON: No plot selected and no EarthAnchorPoint — defaulting to Barcelona.");
            }

            RhinoApp.WriteLine($"DELTA CARBON: {buildingData.Elements.Count} layer(s), " +
                               $"footprint {buildingData.Geometry.FootprintM2:F0} m², " +
                               $"height {buildingData.Geometry.HeightM:F0} m.");

            // ── Step 2: export OBJ and upload to web interface ───────────────────
            await ExportAndUploadObjAsync(doc).ConfigureAwait(false);

            // ── Step 3: send carbon estimate to web interface ─────────────────────
            var apiClient = DeltaCarbonPlugin.Instance?.ApiClient;
            if (apiClient == null)
            {
                RhinoApp.WriteLine("DELTA CARBON: Plugin not initialised — please reload.");
                return;
            }

            var estimate = await apiClient.GetCarbonEstimateAsync(buildingData).ConfigureAwait(false);

            if (estimate?.BaselineCarbon != null)
                RhinoApp.WriteLine($"DELTA CARBON: Synced — {estimate.BaselineCarbon.TotalTonnes:F0} t CO₂e " +
                                   $"({estimate.BaselineCarbon.PerM2:F0} kg/m²). View at http://localhost:8080");
            else
                RhinoApp.WriteLine("DELTA CARBON: Sync failed — is the web interface running at http://localhost:8080?");
        }

        private static async Task ExportAndUploadObjAsync(RhinoDoc doc)
        {
            string tmpPath = Path.Combine(Path.GetTempPath(), $"surround_{Guid.NewGuid():N}.obj");
            try
            {
                var settings = new Rhino.DocObjects.ObjectEnumeratorSettings
                {
                    VisibleFilter = true,
                    LockedObjects = false,
                    ObjectTypeFilter = Rhino.DocObjects.ObjectType.Brep |
                                       Rhino.DocObjects.ObjectType.Extrusion |
                                       Rhino.DocObjects.ObjectType.Mesh
                };

                var sb = new StringBuilder();
                sb.AppendLine("# DeltaCarbon OBJ export");
                int vertexOffset = 1;
                int faceCount = 0;

                foreach (var rhinoObj in doc.Objects.GetObjectList(settings))
                {
                    Rhino.Geometry.Mesh[] meshes = null;

                    if (rhinoObj.Geometry is Rhino.Geometry.Brep brep)
                        meshes = Rhino.Geometry.Mesh.CreateFromBrep(brep,
                            Rhino.Geometry.MeshingParameters.Default);
                    else if (rhinoObj.Geometry is Rhino.Geometry.Extrusion extrusion)
                        meshes = Rhino.Geometry.Mesh.CreateFromBrep(extrusion.ToBrep(),
                            Rhino.Geometry.MeshingParameters.Default);
                    else if (rhinoObj.Geometry is Rhino.Geometry.Mesh mesh)
                        meshes = new[] { mesh };

                    if (meshes == null) continue;

                    foreach (var m in meshes)
                    {
                        if (m == null) continue;
                        double scale = RhinoMath.UnitScale(doc.ModelUnitSystem, UnitSystem.Meters);
                        foreach (var v in m.Vertices)
                            sb.AppendLine($"v {v.X * scale:F4} {v.Z * scale:F4} {-v.Y * scale:F4}");
                        foreach (var f in m.Faces)
                        {
                            if (f.IsTriangle)
                                sb.AppendLine($"f {f.A + vertexOffset} {f.B + vertexOffset} {f.C + vertexOffset}");
                            else
                                sb.AppendLine($"f {f.A + vertexOffset} {f.B + vertexOffset} {f.C + vertexOffset} {f.D + vertexOffset}");
                        }
                        vertexOffset += m.Vertices.Count;
                        faceCount += m.Faces.Count;
                    }
                }

                if (faceCount == 0)
                {
                    RhinoApp.WriteLine("DELTA CARBON: No geometry to export.");
                    return;
                }

                string objText = sb.ToString();
                File.WriteAllText(tmpPath, objText, Encoding.UTF8);
                RhinoApp.WriteLine($"DELTA CARBON: OBJ written ({objText.Length / 1024} KB, {faceCount} faces). Uploading...");

                using (var http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) })
                using (var content = new StringContent(objText, Encoding.UTF8, "model/obj"))
                {
                    var response = await http.PostAsync("http://localhost:8080/api/model/upload", content)
                                             .ConfigureAwait(false);
                    if (response.IsSuccessStatusCode)
                        RhinoApp.WriteLine("DELTA CARBON: OBJ uploaded to web viewer.");
                    else
                        RhinoApp.WriteLine($"DELTA CARBON: Upload failed — {(int)response.StatusCode}.");
                }
            }
            catch (Exception ex)
            {
                RhinoApp.WriteLine($"DELTA CARBON: OBJ export error: {ex.Message}");
            }
            finally
            {
                try { if (File.Exists(tmpPath)) File.Delete(tmpPath); } catch { }
            }
        }

        /// <summary>Reads the plot currently selected in the browser from the local bridge server.</summary>
        private static async Task<Location> ReadSelectedPlotAsync()
        {
            try
            {
                using (var http = new HttpClient { Timeout = TimeSpan.FromSeconds(3) })
                {
                    var json = await http.GetStringAsync("http://localhost:8080/api/plot/select")
                                         .ConfigureAwait(false);
                    var result = JsonConvert.DeserializeObject<PlotResponse>(json);
                    if (result?.Ready == true)
                        return new Location { Lat = result.Lat, Lon = result.Lon };
                }
            }
            catch { /* web interface not running or no plot selected */ }
            return null;
        }

        private class PlotResponse
        {
            [JsonProperty("ready")] public bool   Ready { get; set; }
            [JsonProperty("lat")]   public double Lat   { get; set; }
            [JsonProperty("lon")]   public double Lon   { get; set; }
        }
    }
}
