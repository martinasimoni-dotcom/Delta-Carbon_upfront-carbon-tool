using System;
using Rhino;
using Rhino.Commands;

namespace SurroundPlugin.Commands
{
    /// <summary>
    /// "SurroundMaterials" — opens the material picker dialog.
    /// Full implementation in Phase 2; stub registered so the toolbar button compiles.
    /// </summary>
    [CommandStyle(Style.Hidden)]
    public class SurroundMaterials : Command
    {
        public override string EnglishName => "SurroundMaterials";

        protected override Result RunCommand(RhinoDoc doc, RunMode mode)
        {
            try
            {
                var dialog = new UI.MaterialPickerDialog("Structure");
                dialog.ShowModal(Rhino.UI.RhinoEtoApp.MainWindow);
            }
            catch (Exception ex)
            {
                RhinoApp.WriteLine($"SURROUND: Material picker error: {ex.Message}");
            }

            return Result.Success;
        }
    }
}
