using Newtonsoft.Json;
using System.Collections.Generic;

namespace DeltaCarbon.Models
{
    /// <summary>Full request payload sent to the Delta Carbon estimate API.</summary>
    public class BuildingData
    {
        [JsonProperty("location")]
        public Location Location { get; set; }

        [JsonProperty("geometry")]
        public BuildingGeometry Geometry { get; set; }

        [JsonProperty("elements")]
        public List<BuildingElement> Elements { get; set; } = new List<BuildingElement>();

        [JsonProperty("use_type")]
        public string UseType { get; set; } = "office";
    }

    /// <summary>Massing dimensions derived from the bounding box and layer volumes.</summary>
    public class BuildingGeometry
    {
        [JsonProperty("footprint_m2")]
        public double FootprintM2 { get; set; }

        [JsonProperty("height_m")]
        public double HeightM { get; set; }

        [JsonProperty("floors")]
        public int Floors { get; set; }

        [JsonProperty("total_volume_m3")]
        public double TotalVolumeM3 { get; set; }
    }
}
