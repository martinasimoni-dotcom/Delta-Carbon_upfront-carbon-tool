using System;
using System.Collections.Generic;
using Eto.Drawing;
using Eto.Forms;
using Rhino;
using Rhino.UI;
using SurroundPlugin.Models;

namespace SurroundPlugin.UI
{
    /// <summary>
    /// Docked SURROUND Carbon panel (right side of Rhino window).
    /// Implements Rhino.UI.IPanel so it participates in Rhino's panel system.
    /// The panel GUID must remain stable across builds — it identifies the panel in user preferences.
    /// </summary>
    [System.Runtime.InteropServices.Guid("6F3A2B1C-D4E5-4F60-9A7B-8C9D0E1F2A3B")]
    public class CarbonPanel : Panel, IPanel
    {
        // ── singleton ────────────────────────────────────────────────────────────
        public static CarbonPanel Instance { get; private set; }

        public static Guid PanelId => typeof(CarbonPanel).GUID;

        // ── UI controls ──────────────────────────────────────────────────────────
        private readonly Label _locationLabel;
        private readonly Label _buildingInfoLabel;
        private readonly Label _totalCarbonLabel;
        private readonly Label _perM2Label;
        private readonly DynamicLayout _breakdownLayout;
        private readonly Label _statusLabel;   // loading / error messages
        private readonly Button _btnChangeMaterials;
        private readonly Button _btnCompareScenarios;
        private readonly Button _btnExportPassport;

        // ── colours ──────────────────────────────────────────────────────────────
        private static readonly Color GreenCarbon = Color.FromArgb(0x3C, 0xB3, 0x71);
        private static readonly Color GrayText    = Color.FromArgb(0x88, 0x88, 0x88);
        private static readonly Color RedError    = Color.FromArgb(0xCC, 0x33, 0x33);
        private static readonly Color BgDark      = Color.FromArgb(0x2B, 0x2B, 0x2B);
        private static readonly Color FgLight     = Color.FromArgb(0xEC, 0xEC, 0xEC);

        // ── constructor ──────────────────────────────────────────────────────────

        /// <summary>
        /// Called by Rhino when the panel is opened. documentSerialNumber identifies
        /// which document this panel instance belongs to.
        /// </summary>
        public CarbonPanel(uint documentSerialNumber)
        {
            Instance = this;
            BackgroundColor = BgDark;

            // Initialise all controls upfront so UpdateEstimate never needs to create them
            _locationLabel    = MakeLabel("—", GrayText, 11);
            _buildingInfoLabel = MakeLabel("—", FgLight,  11);
            _totalCarbonLabel = MakeLabel("—",  GreenCarbon, 32, FontStyle.Bold);
            _perM2Label       = MakeLabel("—", GrayText,  13);
            _statusLabel      = MakeLabel(string.Empty, GrayText, 11);
            _breakdownLayout  = new DynamicLayout { DefaultSpacing = new Size(4, 4) };

            _btnChangeMaterials  = MakeButton("Change Materials...");
            _btnCompareScenarios = MakeButton("Compare Scenarios");
            _btnExportPassport   = MakeButton("Export Passport");

            _btnChangeMaterials.Click  += (s, e) => RhinoApp.RunScript("SurroundMaterials",  false);
            _btnCompareScenarios.Click += (s, e) => RhinoApp.RunScript("SurroundCompare",    false);
            _btnExportPassport.Click   += (s, e) => RhinoApp.RunScript("SurroundExport",     false);

            Content = BuildLayout();
            SetLoadingState(false);
        }

        // ── public API ───────────────────────────────────────────────────────────

        /// <summary>Populates every panel element from a completed API response.</summary>
        public void UpdateEstimate(CarbonEstimate estimate, BuildingData buildingData)
        {
            if (estimate?.BaselineCarbon == null) return;

            Application.Instance.Invoke(() =>
            {
                try
                {
                    var bc = estimate.BaselineCarbon;
                    var geo = buildingData?.Geometry;
                    var loc = buildingData?.Location;

                    _locationLabel.Text = loc != null ? loc.ToString() : "—";
                    _buildingInfoLabel.Text = geo != null
                        ? $"{buildingData.UseType}  ·  {geo.FootprintM2:F0} m²  ·  {geo.HeightM:F0} m\nGFA: {geo.FootprintM2 * geo.Floors:F0} m²"
                        : "—";

                    _totalCarbonLabel.Text = $"{bc.TotalTonnes:F0} t CO₂e";
                    _perM2Label.Text       = $"{bc.PerM2:F0} kg / m²";

                    RebuildBreakdown(bc.Breakdown);

                    _statusLabel.Text      = string.Empty;
                    SetButtonsEnabled(true);
                }
                catch (Exception ex)
                {
                    RhinoApp.WriteLine($"SURROUND: Panel update error: {ex.Message}");
                }
            });
        }

        /// <summary>Toggles spinner / disables buttons while waiting for the API.</summary>
        public void SetLoadingState(bool isLoading)
        {
            Application.Instance.Invoke(() =>
            {
                _statusLabel.TextColor = GrayText;
                _statusLabel.Text = isLoading ? "Calculating upfront carbon..." : string.Empty;
                SetButtonsEnabled(!isLoading);
            });
        }

        /// <summary>Shows a red error message in the status area.</summary>
        public void SetErrorState(string message)
        {
            Application.Instance.Invoke(() =>
            {
                _statusLabel.TextColor = RedError;
                _statusLabel.Text = message ?? string.Empty;
                SetButtonsEnabled(false);
            });
        }

        // ── IPanel ───────────────────────────────────────────────────────────────

        public void PanelShown(uint documentSerialNumber, ShowPanelReason reason) { }
        public void PanelHidden(uint documentSerialNumber, ShowPanelReason reason) { }
        public void PanelClosing(uint documentSerialNumber, bool onCloseDocument) { }

        // ── layout builder ───────────────────────────────────────────────────────

        private Control BuildLayout()
        {
            var layout = new DynamicLayout { DefaultPadding = new Padding(12), DefaultSpacing = new Size(0, 8) };

            // Header
            layout.AddRow(MakeLabel("Early Carbon", FgLight, 14, FontStyle.Bold));
            layout.AddRow(MakeSeparator());

            // Location + building info
            layout.AddRow(MakeLabel("LOCATION", GrayText, 9, FontStyle.Bold));
            layout.AddRow(_locationLabel);
            layout.AddRow(_buildingInfoLabel);
            layout.AddRow(MakeSeparator());

            // Totals
            layout.AddRow(_totalCarbonLabel);
            layout.AddRow(_perM2Label);
            layout.AddRow(MakeSeparator());

            // Breakdown
            layout.AddRow(MakeLabel("BREAKDOWN", GrayText, 9, FontStyle.Bold));
            layout.AddRow(_breakdownLayout);
            layout.AddRow(MakeSeparator());

            // Status / loading / error line
            layout.AddRow(_statusLabel);

            // Buttons
            layout.AddRow(_btnChangeMaterials);
            layout.AddRow(_btnCompareScenarios);
            layout.AddRow(_btnExportPassport);
            layout.AddRow(MakeSeparator());

            // Footer disclaimer
            layout.AddRow(MakeLabel("⚠ ±18% accuracy estimate", GrayText, 10));

            // Spacer pushes content to top
            layout.Add(null);

            var scrollable = new Scrollable { Content = layout, Border = BorderType.None };
            scrollable.BackgroundColor = BgDark;
            return scrollable;
        }

        private void RebuildBreakdown(List<CarbonBreakdownItem> items)
        {
            _breakdownLayout.Clear();

            if (items == null || items.Count == 0)
            {
                _breakdownLayout.AddRow(MakeLabel("No data", GrayText, 11));
                return;
            }

            foreach (var item in items)
            {
                // Row label: "Structure — Concrete C30/37 — 35%"
                string labelText = $"{item.Element}  —  {item.MaterialInferred}  —  {item.Percentage:F0}%";
                _breakdownLayout.AddRow(MakeLabel(labelText, FgLight, 11));

                // Progress bar (0–100)
                var bar = new ProgressBar
                {
                    MinValue = 0,
                    MaxValue = 100,
                    Value = (int)Math.Min(100, Math.Max(0, item.Percentage))
                };
                _breakdownLayout.AddRow(bar);
            }
        }

        // ── helpers ──────────────────────────────────────────────────────────────

        private static Label MakeLabel(string text, Color color, int size,
                                       FontStyle style = FontStyle.None)
        {
            // Font(SystemFont, float?) overload doesn't accept FontStyle.
            // Map Bold via the Bold system font; italic unsupported in this helper.
            var systemFont = (style & FontStyle.Bold) != 0 ? SystemFont.Bold : SystemFont.Default;
            return new Label
            {
                Text      = text,
                TextColor = color,
                Font      = new Font(systemFont, size),
                Wrap      = WrapMode.Word
            };
        }

        private static Control MakeSeparator()
            => new Panel { Height = 1, BackgroundColor = Color.FromArgb(0x44, 0x44, 0x44) };

        private static Button MakeButton(string text)
            => new Button { Text = text };

        private void SetButtonsEnabled(bool enabled)
        {
            _btnChangeMaterials.Enabled  = enabled;
            _btnCompareScenarios.Enabled = enabled;
            _btnExportPassport.Enabled   = enabled;
        }
    }
}
