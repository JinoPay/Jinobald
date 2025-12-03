using System.Windows;
using Jinobald.Core.Services.Dialog;
using Jinobald.Core.Services.Toast;

namespace Jinobald.Sample.Wpf.Views;

public partial class MainWindow : Window
{
    public MainWindow(IDialogService dialogService, IToastService toastService)
    {
        InitializeComponent();

        // DialogService에 DialogHost 등록 (생성자 주입)
        dialogService.RegisterHost(DialogHost);

        // ToastService에 ToastHost 등록
        toastService.RegisterHost(ToastHost);
    }
}
