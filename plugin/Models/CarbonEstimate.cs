using Newtonsoft.Json;
using System.Collections.Generic;

namespace DeltaCarbon.Models
{
    /// <summary>Full response from POST /v1/carbon/estimate.</summary>
    public class CarbonEstimate
    {
        [JsonProperty("baseline_carbon")]
        public BaselineCarbon BaselineCarbon { get; set; }

        /// <summary>Material ratios by name, e.g. {"concrete": 0.45, "steel": 0.15}.</summary>
        [JsonProperty("material_profile")]
        public Dictionary<string, double> MaterialProfile { get; set; }

        [JsonProperty("metadata")]
        public EstimateMetadata Metadata { get; set; }
    }

    /// <summary>Total carbon figures and per-element breakdown.</summary>
    public class BaselineCarbon
    {
        [JsonProperty("total_kg_co2e")]
        public double TotalKgCo2e { get; set; }

        [JsonProperty("total_tonnes")]
        public double TotalTonnes { get; set; }

        [JsonProperty("per_m2")]
        public double PerM2 { get; set; }

        [JsonProperty("breakdown")]
        public List<CarbonBreakdownItem> Breakdown { get; set; }
    }

    /// <summary>Inference provenance returned alongside every estimate.</summary>
    public class EstimateMetadata
    {
        [JsonProperty("inference_method")]
        public string InferenceMethod { get; set; }

        [JsonProperty("accuracy_estimate")]
        public string AccuracyEstimate { get; set; }

        [JsonProperty("neighbors_used")]
        public int NeighborsUsed { get; set; }
    }
}
