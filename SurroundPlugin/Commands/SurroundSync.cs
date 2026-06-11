using System;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Rhino;
using Rhino.Commands;
using SurroundPlugin.Models;

namespace SurroundPlugin.Commands
{
    /// <summary>
    /// "SurroundSync" — reads the plot selected in the web interface, then sends
    /// current Rhino geometry to that location. Run after selecting a plot in the browser.
    /// </summary>
    public class SurroundSync : Command
    {
        public override string EnglishName => "SurroundSync";

        protected override Result RunCommand(RhinoDoc doc, RunMode mode)
        {
            try { RunAsync(doc).GetAwaiter().GetResult(); }
            catch (Exception ex) { RhinoApp.WriteLine($"SURROUND: Sync error: {ex.Message}"); }
            return Result.Success;
        }

        private async Task RunAsync(RhinoDoc doc)
        {
            RhinoApp.WriteLine("SURROUND: Syncing to web interface...");

            var analyzer = new Core.GeometryAnalyzer();
            var buildingData = analyzer.Analyze(doc);

            if (buildingData == null || buildingData.Elements.Count == 0)
            {
                RhinoApp.WriteLine("SURROUND: No Brep geometry found. " +
                                   "Add 3D objects to named layers (Structure, Envelope, etc.) and run again.");
                return;
            }

            // ── Step 1: read selected plot from web interface ─────────────────────
            var webPlot = await ReadSelectedPlotAsync().ConfigureAwait(false);
            if (webPlot != null)
            {
                buildingData.Location = webPlot;
                RhinoApp.WriteLine($"SURROUND: Using plot selected in browser — {webPlot}");
            }
            else if (buildingData.Location != null)
            {
                RhinoApp.WriteLine($"SURROUND: No plot selected in browser — using Rhino EarthAnchorPoint {buildingData.Location}");
            }
            else
            {
                buildingData.Location = new Location { Lat = 41.3997, Lon = 2.1888 };
                RhinoApp.WriteLine("SURROUND: No plot selected and no EarthAnchorPoint — defaulting to Barcelona.");
            }

            RhinoApp.WriteLine($"SURROUND: {buildingData.Elements.Count} layer(s), " +
                               $"footprint {buildingData.Geometry.FootprintM2:F0} m², " +
                               $"height {buildingData.Geometry.HeightM:F0} m.");

            // ── Step 2: send to web interface ─────────────────────────────────────
            var apiClient = SurroundPlugin.Instance?.ApiClient;
            if (apiClient == null)
            {
                RhinoApp.WriteLine("SURROUND: Plugin not initialised — please reload.");
                return;
            }

            var estimate = await apiClient.GetCarbonEstimateAsync(buildingData).ConfigureAwait(false);

            if (estimate?.BaselineCarbon != null)
                RhinoApp.WriteLine($"SURROUND: Synced — {estimate.BaselineCarbon.TotalTonnes:F0} t CO₂e " +
                                   $"({estimate.BaselineCarbon.PerM2:F0} kg/m²). View at http://localhost:8080");
            else
                RhinoApp.WriteLine("SURROUND: Sync failed — is the web interface running at http://localhost:8080?");
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
