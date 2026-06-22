using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Drawing.Imaging;
using System.IO;
using Rhino;
using Rhino.PlugIns;
using Rhino.UI;
using SurroundPlugin.Core;

namespace SurroundPlugin
{
    /// <summary>
    /// Plugin entry point. Rhino instantiates this class on load.
    /// Registers the carbon panel and exposes the shared APIClient singleton.
    /// </summary>
    [Guid("8F3A2B1C-4D5E-6F7A-8B9C-0D1E2F3A4B5C")]
    public class SurroundPlugin : PlugIn
    {
        private static SurroundPlugin _instance;
        private APIClient _apiClient;

        /// <summary>Shared plugin instance — available after OnLoad.</summary>
        public static SurroundPlugin Instance => _instance;

        /// <summary>Shared HTTP client. Initialised once; reused across commands.</summary>
        public APIClient ApiClient => _apiClient;

        public SurroundPlugin()
        {
            _instance = this;
        }

        protected override LoadReturnCode OnLoad(ref string errorMessage)
        {
            try
            {
                _apiClient = new APIClient();

                // Register the docked panel — Rhino handles show/hide from the Panels menu
                Panels.RegisterPanel(
                    this,
                    typeof(UI.CarbonPanel),
                    "Delta Carbon",
                    MakePanelIcon());

                RhinoApp.WriteLine("SURROUND: Plugin loaded. Run \"SurroundAnalyze\" to begin.");
                return LoadReturnCode.Success;
            }
            catch (Exception ex)
            {
                errorMessage = $"SURROUND failed to load: {ex.Message}";
                RhinoApp.WriteLine(errorMessage);
                return LoadReturnCode.ErrorShowDialog;
            }
        }

        /// <summary>
        /// Generates a 24×24 green square with a white "S" as a System.Drawing.Icon.
        /// No external image required.
        /// </summary>
        private static System.Drawing.Icon MakePanelIcon()
        {
            try
            {
                var bmp = new System.Drawing.Bitmap(24, 24);
                using (var g = Graphics.FromImage(bmp))
                {
                    g.Clear(Color.FromArgb(0x3C, 0xB3, 0x71));
                    using (var font = new Font("Arial", 13, System.Drawing.FontStyle.Bold))
                    using (var brush = new SolidBrush(Color.White))
                    {
                        var fmt = new StringFormat
                        {
                            Alignment     = StringAlignment.Center,
                            LineAlignment = StringAlignment.Center
                        };
                        g.DrawString("S", font, brush, new RectangleF(0, 0, 24, 24), fmt);
                    }
                }
                // Bitmap → Icon
                IntPtr hIcon = bmp.GetHicon();
                return System.Drawing.Icon.FromHandle(hIcon);
            }
            catch
            {
                // Fallback: blank icon
                var blank = new System.Drawing.Bitmap(16, 16);
                return System.Drawing.Icon.FromHandle(blank.GetHicon());
            }
        }

        protected override void OnShutdown()
        {
            try { _apiClient?.Dispose(); }
            catch { /* ignore shutdown errors */ }
        }
    }
}
