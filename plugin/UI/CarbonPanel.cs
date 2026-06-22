using System;
using System.Net.Http;
using System.Threading.Tasks;
using Eto.Drawing;
using Eto.Forms;
using Rhino;
using Rhino.UI;

namespace SurroundPlugin.UI
{
    /// <summary>
    /// Docked Delta Carbon panel — minimal: Choose Project + Sync.
    /// The panel GUID must remain stable across builds.
    /// </summary>
    [System.Runtime.InteropServices.Guid("6F3A2B1C-D4E5-4F60-9A7B-8C9D0E1F2A3B")]
    public class CarbonPanel : Panel, IPanel
    {
        // ── singleton ────────────────────────────────────────────────────────────
        public static CarbonPanel Instance { get; private set; }
        public static Guid PanelId => typeof(CarbonPanel).GUID;

        // ── colours (web palette) ────────────────────────────────────────────────
        private static readonly Color BgWhite    = Colors.White;
        private static readonly Color TextDark    = Color.FromArgb(17, 17, 17);       // #111111
        private static readonly Color TextGrey    = Color.FromArgb(107, 114, 128);    // #6B7280
        private static readonly Color GreenDark   = Color.FromArgb(26, 71, 49);       // #1a4731
        private static readonly Color BorderGrey  = Color.FromArgb(229, 231, 235);    // #E5E7EB
        private static readonly Color GreenDot    = Color.FromArgb(34, 197, 94);      // indicator green
        private static readonly Color GreyDot     = Color.FromArgb(156, 163, 175);    // indicator grey

        // ── controls ─────────────────────────────────────────────────────────────
        private readonly Label  _projectLabel;
        private readonly Button _btnChooseProject;
        private readonly Button _btnSync;
        private readonly Label  _statusDot;
        private readonly Label  _statusText;
        private readonly Label  _lastSyncLabel;

        // ── state ─────────────────────────────────────────────────────────────────
        private string _currentProjectName = null;
        private UITimer _pollTimer;
        private static readonly HttpClient _http = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };

        // ── constructor ───────────────────────────────────────────────────────────
        public CarbonPanel(uint documentSerialNumber)
        {
            Instance = this;
            BackgroundColor = BgWhite;

            _projectLabel     = MakeLabel("No project selected", TextGrey, 11);
            _btnChooseProject = MakeOutlineButton("CHOOSE PROJECT");
            _btnSync          = MakeFilledButton("SYNC  ↑", GreenDark, Colors.White);
            _statusDot        = MakeLabel("●", GreyDot, 11);
            _statusText       = MakeLabel("Waiting for project...", TextGrey, 11);
            _lastSyncLabel    = MakeLabel("Last sync: —", TextGrey, 10);

            _btnSync.Enabled = false;

            _btnChooseProject.Click += OnChooseProject;
            _btnSync.Click          += OnSync;

            Content = BuildLayout();
            StartPolling();
        }

        // ── IPanel ───────────────────────────────────────────────────────────────
        public void PanelShown(uint documentSerialNumber, ShowPanelReason reason)  { }
        public void PanelHidden(uint documentSerialNumber, ShowPanelReason reason) { }
        public void PanelClosing(uint documentSerialNumber, bool onCloseDocument)  { }

        // ── event handlers ────────────────────────────────────────────────────────
        private void OnChooseProject(object sender, EventArgs e)
        {
            // Open the web dashboard in the default browser
            try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("http://localhost:5173") { UseShellExecute = true }); }
            catch (Exception ex) { RhinoApp.WriteLine($"Delta Carbon: could not open browser — {ex.Message}"); }
        }

        private async void OnSync(object sender, EventArgs e)
        {
            _btnSync.Text    = "SYNCING...";
            _btnSync.Enabled = false;
            _btnChooseProject.Enabled = false;

            await Task.Run(() => RhinoApp.RunScript("SurroundSync", false));

            Application.Instance.Invoke(() =>
            {
                _btnSync.Text    = "SYNC  ↑";
                _btnSync.Enabled = _currentProjectName != null;
                _btnChooseProject.Enabled = true;
                _lastSyncLabel.Text = $"Last sync: {DateTime.Now:HH:mm:ss}";
                SetStatus(true, $"Synced — {_currentProjectName}");
            });
        }

        // ── polling ───────────────────────────────────────────────────────────────
        private void StartPolling()
        {
            _pollTimer = new UITimer { Interval = 3.0 };
            _pollTimer.Elapsed += async (s, e) => await PollProject();
            _pollTimer.Start();
        }

        private async Task PollProject()
        {
            try
            {
                var json = await _http.GetStringAsync("http://localhost:5173/api/plugin/project");
                // Simple JSON parse — avoid adding a dependency on System.Text.Json or Newtonsoft
                var name = ExtractJsonString(json, "projectName");
                if (name != null && name != _currentProjectName)
                {
                    _currentProjectName = name;
                    Application.Instance.Invoke(() =>
                    {
                        _projectLabel.Text   = name;
                        _projectLabel.TextColor = TextDark;
                        _btnSync.Enabled     = true;
                        SetStatus(true, $"Project: {name}");
                    });
                }
                else if (name == null && _currentProjectName != null)
                {
                    _currentProjectName = null;
                    Application.Instance.Invoke(() =>
                    {
                        _projectLabel.Text   = "No project selected";
                        _projectLabel.TextColor = TextGrey;
                        _btnSync.Enabled     = false;
                        SetStatus(false, "Waiting for project...");
                    });
                }
            }
            catch
            {
                // Frontend not running — silent, keep previous state
            }
        }

        // ── helpers ───────────────────────────────────────────────────────────────
        private void SetStatus(bool connected, string text)
        {
            _statusDot.TextColor = connected ? GreenDot : GreyDot;
            _statusText.Text     = text;
        }

        /// <summary>Minimal JSON string extractor — avoids adding a JSON library.</summary>
        private static string ExtractJsonString(string json, string key)
        {
            var search = $"\"{key}\"";
            var idx = json.IndexOf(search, StringComparison.Ordinal);
            if (idx < 0) return null;
            idx += search.Length;
            // skip whitespace and colon
            while (idx < json.Length && (json[idx] == ' ' || json[idx] == ':')) idx++;
            if (idx >= json.Length) return null;
            if (json[idx] == 'n') return null; // null
            if (json[idx] != '"') return null;
            idx++; // skip opening quote
            var end = json.IndexOf('"', idx);
            if (end < 0) return null;
            return json.Substring(idx, end - idx);
        }

        // ── layout builder ────────────────────────────────────────────────────────
        private Control BuildLayout()
        {
            var layout = new DynamicLayout
            {
                DefaultPadding = new Padding(16),
                DefaultSpacing = new Size(0, 10),
                BackgroundColor = BgWhite,
            };

            // Header — "Delta Carbon"
            layout.AddRow(MakeLabel("Delta Carbon", TextDark, 14, FontStyle.Bold));
            layout.AddRow(MakeSeparator());

            // Project display
            layout.AddRow(MakeLabel("PROJECT", TextGrey, 9, FontStyle.Bold));
            layout.AddRow(_projectLabel);

            // Choose Project button
            layout.AddRow(_btnChooseProject);
            layout.AddRow(MakeSeparator());

            // Sync button
            layout.AddRow(_btnSync);

            // Status row
            var statusRow = new DynamicLayout { DefaultSpacing = new Size(4, 0) };
            statusRow.BeginHorizontal();
            statusRow.Add(_statusDot);
            statusRow.Add(_statusText, xscale: true);
            statusRow.EndHorizontal();
            layout.AddRow(statusRow);

            layout.AddRow(_lastSyncLabel);

            // Spacer
            layout.Add(null);

            var scrollable = new Scrollable { Content = layout, Border = BorderType.None };
            scrollable.BackgroundColor = BgWhite;
            return scrollable;
        }

        private static Label MakeLabel(string text, Color color, int size, FontStyle style = FontStyle.None)
        {
            var systemFont = (style & FontStyle.Bold) != 0 ? SystemFont.Bold : SystemFont.Default;
            return new Label
            {
                Text      = text,
                TextColor = color,
                Font      = new Font(systemFont, size),
                Wrap      = WrapMode.Word,
            };
        }

        private static Control MakeSeparator()
            => new Panel { Height = 1, BackgroundColor = BorderGrey };

        private static Button MakeOutlineButton(string text)
        {
            var btn = new Button
            {
                Text            = text,
                BackgroundColor = Colors.White,
                TextColor       = Color.FromArgb(17, 17, 17),
            };
            return btn;
        }

        private static Button MakeFilledButton(string text, Color bg, Color fg)
        {
            var btn = new Button
            {
                Text            = text,
                BackgroundColor = bg,
                TextColor       = fg,
            };
            return btn;
        }
    }
}
