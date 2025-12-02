using Avalonia.Controls;
using Jinobald.Avalonia.Services.Dialog;

namespace Jinobald.Sample.Avalonia.Views;

public partial class MainWindow : Window
{
    public MainWindow(DialogService dialogService)
    {
        InitializeComponent();

        // DialogService에 DialogHost 등록 (생성자 주입)
        dialogService.RegisterHost(DialogHost);
    }
}
