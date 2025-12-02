using System;
using Avalonia.Controls;

namespace Jinobald.Sample.Avalonia.Views.Dialogs;

public partial class NestedTestDialogView : UserControl
{
    public NestedTestDialogView()
    {
        InitializeComponent();
        Height = new Random().Next(300, 500);
    }
}
