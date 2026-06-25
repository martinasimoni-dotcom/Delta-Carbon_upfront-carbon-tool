using Newtonsoft.Json;

namespace DeltaCarbon.Models
{
    /// <summary>Carbon contribution from one building element in the API response breakdown.</summary>
    public class CarbonBreakdownItem
    {
        [JsonProperty("element")]
        public string Element { get; set; }

        [JsonProperty("material_inferred")]
        public string MaterialInferred { get; set; }

        [JsonProperty("volume_m3")]
        public double VolumeM3 { get; set; }

        [JsonProperty("co2_kg")]
        public double Co2Kg { get; set; }

        /// <summary>Share of total building carbon, 0–100.</summary>
        [JsonProperty("percentage")]
        public double Percentage { get; set; }
    }
}
