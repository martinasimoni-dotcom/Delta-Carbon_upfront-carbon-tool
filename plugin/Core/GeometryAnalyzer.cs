using System;
using System.Collections.Generic;
using Rhino;
using Rhino.DocObjects;
using Rhino.Geometry;
using SurroundPlugin.Models;

namespace SurroundPlugin.Core
{
    /// <summary>
    /// Reads the active Rhino document and produces a BuildingData object by:
    ///   - iterating all visible, unlocked layers
    ///   - computing Brep volume per layer (converted to metres)
    ///   - classifying layers by ElementType via keyword matching (PRD §5.1)
    ///   - deriving footprint + height from the model bounding box
    ///   - reading location from EarthAnchorPoint (returns null if not set)
    /// </summary>
    public class GeometryAnalyzer
    {
        // PRD §5.1 keyword table — order matters (Structure before Wall prevents mis-hits)
        private static readonly Dictionary<ElementType, string[]> Keywords =
            new Dictionary<ElementType, string[]>
            {
                { ElementType.Foundation, new[] { "foundation", "base", "pile", "footing" } },
                { ElementType.Structure,  new[] { "structure", "column", "beam", "slab", "core" } },
                { ElementType.Envelope,   new[] { "wall", "facade", "envelope", "curtain", "cladding" } },
                { ElementType.Floors,     new[] { "floor", "deck", "ceiling" } },
                { ElementType.Roof,       new[] { "roof", "canopy" } },
            };

        /// <summary>
        /// Analyses the document and returns a populated BuildingData.
        /// Location is null when EarthAnchorPoint is not set — the caller must prompt for it.
        /// </summary>
        public BuildingData Analyze(RhinoDoc doc)
        {
            if (doc == null) throw new ArgumentNullException(nameof(doc));

            // Scale factor: Rhino units → metres (cubed later per volume)
            double unitScale = RhinoMath.UnitScale(doc.ModelUnitSystem, UnitSystem.Meters);

            var elements = ExtractElements(doc, unitScale);
            var location = ReadLocation(doc);
            var (footprint, height, totalVolume) = ComputeBuildingDimensions(doc, unitScale);
            int floors = height > 0 ? Math.Max(1, (int)Math.Round(height / 3.5)) : 1;

            return new BuildingData
            {
                Location = location,
                Geometry = new BuildingGeometry
                {
                    FootprintM2 = footprint,
                    HeightM = height,
                    Floors = floors,
                    TotalVolumeM3 = totalVolume
                },
                Elements = elements,
                UseType = "office"
            };
        }

        // ── private helpers ──────────────────────────────────────────────────────

        private List<BuildingElement> ExtractElements(RhinoDoc doc, double unitScale)
        {
            // Accumulate volume per layer index
            var volumeByLayer = new Dictionary<int, double>();

            var settings = new ObjectEnumeratorSettings
            {
                VisibleFilter = true,
                LockedObjects = false,
                ObjectTypeFilter = ObjectType.Brep | ObjectType.Extrusion
            };

            foreach (var rhinoObj in doc.Objects.GetObjectList(settings))
            {
                var layer = doc.Layers[rhinoObj.Attributes.LayerIndex];
                if (layer == null || !layer.IsVisible || layer.IsLocked) continue;

                double vol = ComputeObjectVolume(rhinoObj, unitScale);
                if (vol <= 0) continue;

                int idx = rhinoObj.Attributes.LayerIndex;
                if (!volumeByLayer.ContainsKey(idx))
                    volumeByLayer[idx] = 0;
                volumeByLayer[idx] += vol;
            }

            var elements = new List<BuildingElement>();
            foreach (var kvp in volumeByLayer)
            {
                var layer = doc.Layers[kvp.Key];
                if (layer == null) continue;

                var elementType = ClassifyLayer(layer.Name);
                elements.Add(new BuildingElement
                {
                    Name = layer.Name,
                    ElementType = elementType,
                    VolumeM3 = Math.Round(kvp.Value, 2),
                    Material = null
                });
            }

            return elements;
        }

        private double ComputeObjectVolume(RhinoObject rhinoObj, double unitScale)
        {
            try
            {
                Brep brep = null;

                if (rhinoObj is BrepObject brepObj)
                    brep = brepObj.BrepGeometry;
                else if (rhinoObj is ExtrusionObject extObj)
                    brep = extObj.ExtrusionGeometry?.ToBrep();

                if (brep == null) return 0;

                var mp = VolumeMassProperties.Compute(brep);
                if (mp == null) return 0;

                // unitScale is linear; cube it for volume
                return Math.Abs(mp.Volume) * Math.Pow(unitScale, 3);
            }
            catch (Exception ex)
            {
                RhinoApp.WriteLine($"SURROUND: Volume compute error on {rhinoObj.Id}: {ex.Message}");
                return 0;
            }
        }

        private ElementType ClassifyLayer(string layerName)
        {
            if (string.IsNullOrWhiteSpace(layerName)) return ElementType.Other;
            string lower = layerName.ToLowerInvariant();

            foreach (var kvp in Keywords)
                foreach (var keyword in kvp.Value)
                    if (lower.Contains(keyword))
                        return kvp.Key;

            return ElementType.Other;
        }

        private Location ReadLocation(RhinoDoc doc)
        {
            try
            {
                var anchor = doc.EarthAnchorPoint;
                if (anchor != null &&
                    (anchor.EarthBasepointLatitude != 0 || anchor.EarthBasepointLongitude != 0))
                {
                    return new Location
                    {
                        Lat = anchor.EarthBasepointLatitude,
                        Lon = anchor.EarthBasepointLongitude
                    };
                }
            }
            catch (Exception ex)
            {
                RhinoApp.WriteLine($"SURROUND: EarthAnchorPoint read error: {ex.Message}");
            }

            return null; // caller must prompt user
        }

        private (double footprint, double height, double totalVolume) ComputeBuildingDimensions(
            RhinoDoc doc, double unitScale)
        {
            try
            {
                var bbox = BoundingBox.Empty;
                // Only use Brep/Extrusion geometry — ignore curves, points, annotations, etc.
                var settings = new ObjectEnumeratorSettings
                {
                    VisibleFilter = true,
                    LockedObjects = false,
                    ObjectTypeFilter = ObjectType.Brep | ObjectType.Extrusion
                };

                foreach (var obj in doc.Objects.GetObjectList(settings))
                {
                    var b = obj.Geometry?.GetBoundingBox(false) ?? BoundingBox.Empty;
                    if (b.IsValid) bbox.Union(b);
                }

                if (!bbox.IsValid) return (0, 0, 0);

                double sx = (bbox.Max.X - bbox.Min.X) * unitScale;
                double sy = (bbox.Max.Y - bbox.Min.Y) * unitScale;
                double sz = (bbox.Max.Z - bbox.Min.Z) * unitScale;

                return (Math.Round(sx * sy, 1), Math.Round(sz, 1), Math.Round(sx * sy * sz, 1));
            }
            catch (Exception ex)
            {
                RhinoApp.WriteLine($"SURROUND: Bounding box error: {ex.Message}");
                return (0, 0, 0);
            }
        }
    }
}
