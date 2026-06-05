using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Rhino;
using SurroundPlugin.Models;

namespace SurroundPlugin.Core
{
    /// <summary>
    /// HTTP client for the SURROUND cloud API.
    /// API key is read from Windows Credential Manager (target name: "SurroundPlugin").
    /// Retries once on network failure; returns null on final failure.
    /// </summary>
    public class APIClient : IDisposable
    {
        // Override by storing a URL in Credential Manager target "SurroundPlugin_URL",
        // or by passing baseUrl explicitly. Defaults to the Railway-deployed API.
        private const string DefaultBaseUrl   = "https://surround-api-production.up.railway.app";
        private const string CredentialTarget  = "SurroundPlugin";
        private const string UrlCredTarget     = "SurroundPlugin_URL";
        private const string EstimateEndpoint  = "/v1/carbon/estimate";

        private readonly HttpClient _http;

        public APIClient() : this(ReadUrlFromCredentialManager() ?? DefaultBaseUrl) { }

        public APIClient(string baseUrl)
        {
            _http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            _http.BaseAddress = new Uri(baseUrl);
            _http.DefaultRequestHeaders.Accept.Add(
                new MediaTypeWithQualityHeaderValue("application/json"));

            string apiKey = ReadApiKeyFromCredentialManager();
            if (!string.IsNullOrEmpty(apiKey))
                _http.DefaultRequestHeaders.Add("X-API-Key", apiKey);
            else
                RhinoApp.WriteLine("SURROUND: No API key found in Credential Manager. " +
                                   "Add one with target name \"SurroundPlugin\".");
        }

        /// <summary>
        /// Sends building data to the estimate endpoint and deserialises the response.
        /// Returns null and logs the error if both attempts fail.
        /// </summary>
        public async Task<CarbonEstimate> GetCarbonEstimateAsync(BuildingData buildingData)
        {
            if (buildingData == null) throw new ArgumentNullException(nameof(buildingData));

            string json = JsonConvert.SerializeObject(buildingData, Formatting.None);
            RhinoApp.WriteLine($"SURROUND: POST {_http.BaseAddress}{EstimateEndpoint}");

            for (int attempt = 1; attempt <= 2; attempt++)
            {
                try
                {
                    using (var content = new StringContent(json, Encoding.UTF8, "application/json"))
                    using (var response = await _http.PostAsync(EstimateEndpoint, content)
                                                     .ConfigureAwait(false))
                    {
                        string responseBody = await response.Content.ReadAsStringAsync()
                                                            .ConfigureAwait(false);

                        if (!response.IsSuccessStatusCode)
                        {
                            RhinoApp.WriteLine(
                                $"SURROUND: API returned {(int)response.StatusCode}: {responseBody}");
                            return null; // non-retryable (4xx/5xx)
                        }

                        return JsonConvert.DeserializeObject<CarbonEstimate>(responseBody);
                    }
                }
                catch (TaskCanceledException)
                {
                    RhinoApp.WriteLine($"SURROUND: Request timed out (attempt {attempt}/2).");
                }
                catch (HttpRequestException ex)
                {
                    RhinoApp.WriteLine($"SURROUND: Network error (attempt {attempt}/2): {ex.Message}");
                }
                catch (Exception ex)
                {
                    RhinoApp.WriteLine($"SURROUND: Unexpected error: {ex.Message}");
                    return null; // non-retryable
                }
            }

            RhinoApp.WriteLine("SURROUND: Both API attempts failed. Check your connection.");
            return null;
        }

        public void Dispose() => _http?.Dispose();

        // ── Windows Credential Manager P/Invoke ─────────────────────────────────

        /// <summary>Reads the API base URL from Credential Manager (optional override).</summary>
        private static string ReadUrlFromCredentialManager()
        {
            try
            {
                if (!CredRead(UrlCredTarget, CRED_TYPE_GENERIC, 0, out IntPtr ptr))
                    return null;
                try
                {
                    var c = Marshal.PtrToStructure<CREDENTIAL>(ptr);
                    if (c.CredentialBlobSize == 0) return null;
                    int sz = (int)c.CredentialBlobSize;
                    byte[] bytes = new byte[sz];
                    System.Runtime.InteropServices.Marshal.Copy(c.CredentialBlob, bytes, 0, sz);
                    return Encoding.Unicode.GetString(bytes).TrimEnd('\0');
                }
                finally { CredFree(ptr); }
            }
            catch { return null; }
        }

        /// <summary>Reads a Generic credential from Windows Credential Manager.</summary>
        private static string ReadApiKeyFromCredentialManager()
        {
            try
            {
                if (!CredRead(CredentialTarget, CRED_TYPE_GENERIC, 0, out IntPtr credPtr))
                    return string.Empty;

                try
                {
                    var cred = Marshal.PtrToStructure<CREDENTIAL>(credPtr);
                    if (cred.CredentialBlobSize == 0) return string.Empty;

                    int blobSize = (int)cred.CredentialBlobSize;
                    byte[] bytes = new byte[blobSize];
                    // Explicit cast to int resolves overload ambiguity with uint
                    System.Runtime.InteropServices.Marshal.Copy(cred.CredentialBlob, bytes, 0, blobSize);
                    return Encoding.Unicode.GetString(bytes);
                }
                finally
                {
                    CredFree(credPtr);
                }
            }
            catch (Exception ex)
            {
                RhinoApp.WriteLine($"SURROUND: Credential Manager error: {ex.Message}");
                return string.Empty;
            }
        }

        private const uint CRED_TYPE_GENERIC = 1;

        [DllImport("advapi32.dll", EntryPoint = "CredReadW",
                   CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern bool CredRead(
            string target, uint type, uint flags, out IntPtr credential);

        [DllImport("advapi32.dll", EntryPoint = "CredFree")]
        private static extern void CredFree(IntPtr buffer);

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct CREDENTIAL
        {
            public uint Flags;
            public uint Type;
            public string TargetName;
            public string Comment;
            public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
            public uint CredentialBlobSize;
            public IntPtr CredentialBlob;
            public uint Persist;
            public uint AttributeCount;
            public IntPtr Attributes;
            public string TargetAlias;
            public string UserName;
        }
    }
}
