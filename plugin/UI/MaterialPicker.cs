using System;
using Eto.Forms;
using Eto.Drawing;
using DeltaCarbon.Core;
using DeltaCarbon.Models;

namespace DeltaCarbon.UI
{
    /// <summary>
    /// Material picker dialog — Phase 2 feature.
    /// Stub present so the project compiles; full implementation in Phase 2.
    /// </summary>
    public class MaterialPickerDialog : Dialog
    {
        public string SelectedMaterial { get; private set; }

        public MaterialPickerDialog(string elementName)
        {
            Title  = $"SELECT MATERIAL — {elementName}";
            Width  = 420;
            Height = 480;

            var label = new Label
            {
                Text      = "Material picker will be implemented in Phase 2.",
                TextColor = Colors.Gray
            };

            var btnClose = new Button { Text = "Close" };
            btnClose.Click += (s, e) => Close();

            Content = new DynamicLayout
            {
                DefaultPadding  = new Padding(16),
                DefaultSpacing  = new Eto.Drawing.Size(0, 8)
            };
            ((DynamicLayout)Content).AddRow(label);
            ((DynamicLayout)Content).AddRow(btnClose);
        }
    }
}
