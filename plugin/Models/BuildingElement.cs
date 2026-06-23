using Newtonsoft.Json;

namespace DeltaCarbon.Models
{
    /// <summary>Structural element types, mapped from Rhino layer names.</summary>
    public enum ElementType
    {
        Foundation,
        Structure,
        Envelope,
        Floors,
        Roof,
        Other
    }

    /// <summary>A single building element volume extracted from a Rhino layer.</summary>
    public class BuildingElement
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        /// <summary>Serialised as lowercase string per API contract (e.g. "structure").</summary>
        [JsonProperty("type")]
        public string Type => ElementType.ToString().ToLowerInvariant();

        /// <summary>Not serialised — used only client-side for classification.</summary>
        [JsonIgnore]
        public ElementType ElementType { get; set; }

        [JsonProperty("volume_m3")]
        public double VolumeM3 { get; set; }

        /// <summary>Null means "infer from database"; set after user override.</summary>
        [JsonProperty("material")]
        public string Material { get; set; }
    }
}
