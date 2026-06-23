using System;
using Rhino;
using Rhino.Commands;

namespace DeltaCarbon.Commands
{
    /// <summary>
    /// "DeltaCarbonExport" — exports the Material Passport PDF.
    /// Full implementation in Phase 2 (PdfSharp); stub present so toolbar button compiles.
    /// </summary>
    [CommandStyle(Style.Hidden)]
    public class DeltaCarbonExport : Command
    {
        public override string EnglishName => "DeltaCarbonExport";

        protected override Result RunCommand(RhinoDoc doc, RunMode mode)
        {
            RhinoApp.WriteLine("DELTA CARBON: PDF export will be available in Phase 2.");
            return Result.Success;
        }
    }
}
