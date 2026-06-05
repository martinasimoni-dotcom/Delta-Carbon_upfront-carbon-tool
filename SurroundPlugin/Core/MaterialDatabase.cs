using System;
using System.Collections.Generic;
using System.Linq;
using SurroundPlugin.Models;

namespace SurroundPlugin.Core
{
    /// <summary>
    /// In-memory EPD material database seeded from PRD §9 (MaterialePyramiden).
    /// Phase 2 will persist this to AppData as a JSON cache updated weekly.
    /// </summary>
    public class MaterialDatabase
    {
        private static readonly List<MaterialProfile> _materials = new List<MaterialProfile>
        {
            new MaterialProfile { Name = "Concrete C30/37",        Co2ePerM3 =  282,   Category = "Mineral"  },
            new MaterialProfile { Name = "Brick",                  Co2ePerM3 =  297,   Category = "Mineral"  },
            new MaterialProfile { Name = "Stone Wool Insulation",  Co2ePerM3 =   93.3, Category = "Mineral"  },
            new MaterialProfile { Name = "Glass (double glazing)", Co2ePerM3 =  850,   Category = "Mineral"  },
            new MaterialProfile { Name = "Structural Steel",       Co2ePerM3 = 5403,   Category = "Metal"    },
            new MaterialProfile { Name = "Aluminium",              Co2ePerM3 = 28890,  Category = "Metal"    },
            new MaterialProfile { Name = "CLT Timber",             Co2ePerM3 = -664,   Category = "Biobased" },
            new MaterialProfile { Name = "Wood Fibre",             Co2ePerM3 = -127,   Category = "Biobased" },
            new MaterialProfile { Name = "Straw",                  Co2ePerM3 = -127,   Category = "Biobased" },
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
