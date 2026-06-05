using Newtonsoft.Json;

namespace SurroundPlugin.Models
{
    /// <summary>
    /// EPD material data entry from the local cache (MaterialePyramiden source).
    /// Used for offline recalculation and the material picker dialog.
    /// </summary>
    public class MaterialProfile
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        /// <summary>A1–A3 embodied carbon in kg CO₂e per m³ (negative = carbon storage).</summary>
        [JsonProperty("co2e_per_m3")]
        public double Co2ePerM3 { get; set; }

        /// <summary>"Mineral", "Metal", or "Biobased".</summary>
        [JsonProperty("category")]
        public string Category { get; set; }
    }
}
