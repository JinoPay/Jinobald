using System;
using System.Windows.Controls;

namespace Jinobald.Sample.Wpf.Views.Dialogs;

public partial class NestedTestDialogView : UserControl
{
    public NestedTestDialogView()
    {
        InitializeComponent();
        Height = new Random().Next(300, 500);
    }
}
