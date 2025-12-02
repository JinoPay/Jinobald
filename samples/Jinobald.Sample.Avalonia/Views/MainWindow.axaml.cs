using Avalonia.Controls;
using Jinobald.Core.Services.Dialog;

namespace Jinobald.Sample.Avalonia.Views;

public partial class MainWindow : Window
{
    public MainWindow(IDialogService dialogService)
    {
        InitializeComponent();

        // DialogService에 DialogHost 등록 (생성자 주입)
        dialogService.RegisterHost(DialogHost);
    }
}
