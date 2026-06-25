using System;
using System.Collections.Generic;
using System.Linq;
using DeltaCarbon.Models;

// Carbon coefficients source: BEDEC/ITeC (Institut de Tecnologia de la Construcció de Catalunya)
// Values: kg CO₂e/m³ at A1–A3. Retrieved via 2050-materials API, country="ES".
// Last aligned: June 2026

namespace DeltaCarbon.Core
{
    /// <summary>
    /// In-memory EPD material database. Coefficients from BEDEC/ITeC, country="ES".
    /// Phase 2 will persist this to AppData as a JSON cache updated weekly.
    /// </summary>
    public class MaterialDatabase
    {
        private static readonly List<MaterialProfile> _materials = new List<MaterialProfile>
        {
            new MaterialProfile { Name = "Concrete C30/37",        Co2ePerM3 =   312,  Category = "Mineral"  }, // BEDEC/ITeC: +312 kg CO₂e/m³
            new MaterialProfile { Name = "Brick",                  Co2ePerM3 =   432,  Category = "Mineral"  }, // BEDEC/ITeC: +432 kg CO₂e/m³
            new MaterialProfile { Name = "Stone Wool Insulation",  Co2ePerM3 =    93,  Category = "Mineral"  }, // BEDEC/ITeC: +93 kg CO₂e/m³
            new MaterialProfile { Name = "Glass (double glazing)", Co2ePerM3 =   850,  Category = "Mineral"  }, // TODO: verify against BEDEC/ITeC
            new MaterialProfile { Name = "Structural Steel",       Co2ePerM3 = 11461,  Category = "Metal"    }, // BEDEC/ITeC: +11,461 kg CO₂e/m³
            new MaterialProfile { Name = "Aluminium",              Co2ePerM3 = 46605,  Category = "Metal"    }, // BEDEC/ITeC: +46,605 kg CO₂e/m³
            new MaterialProfile { Name = "CLT Timber",             Co2ePerM3 =  -400,  Category = "Biobased" }, // BEDEC/ITeC: −400 kg CO₂e/m³
            new MaterialProfile { Name = "Wood Fibre",             Co2ePerM3 =  -127,  Category = "Biobased" }, // TODO: verify against BEDEC/ITeC
            new MaterialProfile { Name = "Straw",                  Co2ePerM3 =  -120,  Category = "Biobased" }, // BEDEC/ITeC: −120 kg CO₂e/m³
        };

        /// <summary>Returns all available materials.</summary>
        public IReadOnlyList<MaterialProfile> GetAll() => _materials.AsReadOnly();

        /// <summary>Returns materials filtered by category ("Mineral", "Metal", "Biobased").</summary>
        public IReadOnlyList<MaterialProfile> GetByCategory(string category) =>
            _materials.Where(m => m.Category.Equals(category, StringComparison.OrdinalIgnoreCase))
                      .ToList()
                      .AsReadOnly();

        /// <summary>Looks up a material by exact name. Returns null if not found.</summary>
        public MaterialProfile Find(string name) =>
            _materials.FirstOrDefault(m =>
                m.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
    }
}
