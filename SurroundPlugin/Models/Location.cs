using Newtonsoft.Json;

namespace SurroundPlugin.Models
{
    /// <summary>Geographic coordinates of the building site.</summary>
    public class Location
    {
        [JsonProperty("lat")]
        public double Lat { get; set; }

        [JsonProperty("lon")]
        public double Lon { get; set; }

        public override string ToString() => $"{Lat:F4}°N, {Lon:F4}°E";
    }
}
