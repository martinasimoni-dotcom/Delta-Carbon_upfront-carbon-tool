using System;
using System.Collections.Generic;
using DeltaCarbon.Models;

namespace DeltaCarbon.Core
{
    // Carbon coefficients source: BEDEC/ITeC (Institut de Tecnologia de la Construcció de Catalunya)
    // Values: kg CO₂e/m³ at A1–A3. Retrieved via 2050-materials API, country="ES".
    // Last aligned: June 2026

    /// <summary>
    /// Recalculates carbon totals locally when the user overrides a material.
    /// Coefficients from BEDEC/ITeC, country="ES".
    /// </summary>
    public class CarbonCalculator
    {
        // EPD A1–A3 coefficients kg CO₂e/m³ — BEDEC/ITeC source
        public static readonly IReadOnlyDictionary<string, double> EpdCoefficients =
            new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase)
            {
                { "Concrete C30/37",        312   }, // BEDEC/ITeC: +312 kg CO₂e/m³
                { "Brick",                  432   }, // BEDEC/ITeC: +432 kg CO₂e/m³
                { "Structural Steel",      11461  }, // BEDEC/ITeC: +11,461 kg CO₂e/m³
                { "Aluminium",             46605  }, // BEDEC/ITeC: +46,605 kg CO₂e/m³
                { "CLT Timber",             -400  }, // BEDEC/ITeC: −400 kg CO₂e/m³
                { "Wood Fibre",             -127  }, // TODO: verify against BEDEC/ITeC
                { "Straw",                  -120  }, // BEDEC/ITeC: −120 kg CO₂e/m³
                { "Stone Wool Insulation",    93  }, // BEDEC/ITeC: +93 kg CO₂e/m³
                { "Glass (double glazing)",  850  }, // TODO: verify against BEDEC/ITeC
            };

        /// <summary>
        /// Returns kg CO₂e for a given volume and material name.
        /// Returns 0 and logs a warning if the material is unknown.
        /// </summary>
        public double Calculate(double volumeM3, string materialName)
        {
            if (EpdCoefficients.TryGetValue(materialName, out double coeff))
                return volumeM3 * coeff;

            Rhino.RhinoApp.WriteLine($"DELTA CARBON: Unknown material '{materialName}' — carbon set to 0.");
            return 0;
        }

        /// <summary>
        /// Rebuilds a CarbonEstimate from a BuildingData where element materials have been overridden.
        /// </summary>
        public CarbonEstimate RecalculateFromOverrides(BuildingData data)
        {
            if (data == null) throw new ArgumentNullException(nameof(data));

            double totalKg = 0;
            var breakdown = new List<CarbonBreakdownItem>();

            foreach (var element in data.Elements)
            {
                string mat = element.Material ?? "Concrete C30/37";
                double co2 = Calculate(element.VolumeM3, mat);
                totalKg += co2;
                breakdown.Add(new CarbonBreakdownItem
                {
                    Element = element.Name,
                    MaterialInferred = mat,
                    VolumeM3 = element.VolumeM3,
                    Co2Kg = co2,
                    Percentage = 0 // computed in second pass below
                });
            }

            // Second pass: percentages
            foreach (var item in breakdown)
                item.Percentage = totalKg > 0
                    ? Math.Round(item.Co2Kg / totalKg * 100, 1)
                    : 0;

            double footprint = data.Geometry?.FootprintM2 ?? 0;
            int floors = data.Geometry?.Floors ?? 1;
            double gfa = footprint * floors;

            return new CarbonEstimate
            {
                BaselineCarbon = new BaselineCarbon
                {
                    TotalKgCo2e = Math.Round(totalKg, 0),
                    TotalTonnes = Math.Round(totalKg / 1000, 1),
                    PerM2 = gfa > 0 ? Math.Round(totalKg / gfa, 0) : 0,
                    Breakdown = breakdown
                },
                Metadata = new EstimateMetadata
                {
                    InferenceMethod = "local_epd_override",
                    AccuracyEstimate = "±18%",
                    NeighborsUsed = 0
                }
            };
        }
    }
}
