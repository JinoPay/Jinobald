using System.Windows;

namespace Jinobald.Sample.Wpf.Views;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        // DialogHost와 ToastHost는 ApplicationBase에서 자동으로 등록됩니다.
    }
}
