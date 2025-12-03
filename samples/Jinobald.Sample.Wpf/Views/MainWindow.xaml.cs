using System.Windows;
using Jinobald.Core.Services.Dialog;

namespace Jinobald.Sample.Wpf.Views;

public partial class MainWindow : Window
{
    public MainWindow(IDialogService dialogService)
    {
        InitializeComponent();

        // DialogService에 DialogHost 등록 (생성자 주입)
        dialogService.RegisterHost(DialogHost);
    }
}
