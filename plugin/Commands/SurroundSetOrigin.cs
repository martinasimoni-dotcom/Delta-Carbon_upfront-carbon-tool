using System;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Rhino;
using Rhino.Commands;

namespace SurroundPlugin.Commands
{
    public class SurroundSetOrigin : Command
    {
        public override string EnglishName => "SurroundSetOrigin";

        protected override Result RunCommand(RhinoDoc doc, RunMode mode)
        {
            try { RunAsync(doc).GetAwaiter().GetResult(); }
            catch (Exception ex) { RhinoApp.WriteLine($"SURROUND: SetOrigin error: {ex.Message}"); }
            return Result.Success;
        }

        private async Task RunAsync(RhinoDoc doc)
        {
            PlotResponse plot = null;
            try
            {
                using (var http = new HttpClient { Timeout = TimeSpan.FromSeconds(3) })
                {
                    var json = await http.GetStringAsync("http://localhost:8080/api/plot/select")
                                         .ConfigureAwait(false);
                    plot = JsonConvert.DeserializeObject<PlotResponse>(json);
                }
            }
            catch { /* web interface not running */ }

            if (plot == null || !plot.Ready)
            {
                RhinoApp.WriteLine("SURROUND: No plot selected in browser. " +
                                   "Select a plot on the web interface and click \"Send to Rhino\" first.");
                return;
            }

            var anchor = doc.EarthAnchorPoint;
            anchor.EarthBasepointLatitude  = plot.Lat;
            anchor.EarthBasepointLongitude = plot.Lon;
            anchor.EarthBasepointElevation = 0;
            doc.EarthAnchorPoint = anchor;
            doc.Modified = true;

            RhinoApp.WriteLine($"SURROUND: Origin set to {plot.Lat:F6}, {plot.Lon:F6}. " +
                               "Build your model at (0,0,0) and run SurroundSync to sync.");
        }

        private class PlotResponse
        {
            [JsonProperty("ready")] public bool   Ready { get; set; }
            [JsonProperty("lat")]   public double Lat   { get; set; }
            [JsonProperty("lon")]   public double Lon   { get; set; }
        }
    }
}
