using System;
using System.Threading.Tasks;
using Rhino;
using Rhino.Commands;
using Rhino.Input.Custom;
using DeltaCarbon.Models;

namespace DeltaCarbon.Commands
{
    /// <summary>
    /// "DeltaCarbonAnalyze" — the main pipeline command.
    /// Extracts geometry → calls API → updates the carbon panel.
    /// </summary>
    [CommandStyle(Style.Hidden)]
    public class DeltaCarbonAnalyze : Command
    {
        public override string EnglishName => "DeltaCarbonAnalyze";

        protected override Result RunCommand(RhinoDoc doc, RunMode mode)
        {
            // Bridge sync Rhino command loop → async pipeline
            try
            {
                RunAsync(doc).GetAwaiter().GetResult();
            }
            catch (Exception ex)
            {
                RhinoApp.WriteLine($"DELTA CARBON: Unhandled error: {ex.Message}");
            }

            return Result.Success;
        }

        private async Task RunAsync(RhinoDoc doc)
        {
            RhinoApp.WriteLine("DELTA CARBON: Analysing model...");

            try
            {
                // ── Step 1: extract geometry ──────────────────────────────────────
                RhinoApp.WriteLine("DELTA CARBON: Scanning model geometry...");
                var analyzer = new Core.GeometryAnalyzer();
                var buildingData = analyzer.Analyze(doc);

                if (buildingData == null || buildingData.Elements.Count == 0)
                {
                    const string msg = "No visible Brep geometry found. " +
                                       "Organise your massing as Breps on named layers and try again.";
                    RhinoApp.WriteLine($"DELTA CARBON: ERROR — {msg}");
                    return;
                }

                RhinoApp.WriteLine($"DELTA CARBON: {buildingData.Elements.Count} layer(s) found. " +
                                   $"Footprint {buildingData.Geometry.FootprintM2:F0} m², " +
                                   $"height {buildingData.Geometry.HeightM:F0} m.");

                // ── Step 2: location ──────────────────────────────────────────────
                if (buildingData.Location == null)
                {
                    RhinoApp.WriteLine("DELTA CARBON: No EarthAnchorPoint set. Enter coordinates manually.");
                    var location = PromptForLocation();
                    if (location == null)
                    {
                        RhinoApp.WriteLine("DELTA CARBON: Cancelled - no location provided.");
                        return;
                    }
                    buildingData.Location = location;
                }

                RhinoApp.WriteLine($"DELTA CARBON: Location {buildingData.Location}");
                RhinoApp.WriteLine("DELTA CARBON: Sending geometry to carbon engine...");

                // ── Step 3: API call ──────────────────────────────────────────────
                var apiClient = DeltaCarbonPlugin.Instance?.ApiClient;
                if (apiClient == null)
                {
                    const string msg = "Plugin not fully initialised — please reload.";
                    RhinoApp.WriteLine($"DELTA CARBON: {msg}");
                    return;
                }

                var estimate = await apiClient.GetCarbonEstimateAsync(buildingData)
                                              .ConfigureAwait(false);

                // ── Step 4: update panel ──────────────────────────────────────────
                if (estimate?.BaselineCarbon != null)
                {
                    RhinoApp.WriteLine(
                        $"SURROUND: {estimate.BaselineCarbon.TotalTonnes:F0} t CO₂e  " +
                        $"({estimate.BaselineCarbon.PerM2:F0} kg/m²)");
                }
                else
                {
                    const string msg = "API did not return a valid estimate. " +
                                       "Check your API key (Credential Manager → \"SurroundPlugin\") " +
                                       "and network connection.";
                    RhinoApp.WriteLine($"DELTA CARBON: {msg}");
                }
            }
            catch (Exception ex)
            {
                RhinoApp.WriteLine($"DELTA CARBON: ERROR — {ex.Message}");
            }
            finally
            {
            }
        }

        /// <summary>Prompts the user to type lat/lon when EarthAnchorPoint is not set.</summary>
        private Location PromptForLocation()
        {
            try
            {
                var getNum = new GetNumber();

                getNum.SetCommandPrompt("Enter latitude (-90 to 90)");
                getNum.SetLowerLimit(-90, false);
                getNum.SetUpperLimit( 90, false);
                if (getNum.Get() != Rhino.Input.GetResult.Number) return null;
                double lat = getNum.Number();

                getNum.SetCommandPrompt("Enter longitude (-180 to 180)");
                getNum.SetLowerLimit(-180, false);
                getNum.SetUpperLimit( 180, false);
                if (getNum.Get() != Rhino.Input.GetResult.Number) return null;
                double lon = getNum.Number();

                return new Location { Lat = lat, Lon = lon };
            }
            catch (Exception ex)
            {
                RhinoApp.WriteLine($"DELTA CARBON: Location prompt error: {ex.Message}");
                return null;
            }
        }
    }
}
