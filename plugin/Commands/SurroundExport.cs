using System;
using Rhino;
using Rhino.Commands;

namespace SurroundPlugin.Commands
{
    /// <summary>
    /// "SurroundExport" — exports the Material Passport PDF.
    /// Full implementation in Phase 2 (PdfSharp); stub present so toolbar button compiles.
    /// </summary>
    [CommandStyle(Style.Hidden)]
    public class SurroundExport : Command
    {
        public override string EnglishName => "SurroundExport";

        protected override Result RunCommand(RhinoDoc doc, RunMode mode)
        {
            RhinoApp.WriteLine("SURROUND: PDF export will be available in Phase 2.");
            return Result.Success;
        }
    }
}
