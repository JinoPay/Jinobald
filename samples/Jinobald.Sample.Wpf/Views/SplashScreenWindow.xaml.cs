using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using Jinobald.Core.Application;

namespace Jinobald.Sample.Wpf.Views;

/// <summary>
///     스플래시 화면 윈도우
///     ISplashScreen 인터페이스 구현
/// </summary>
public partial class SplashScreenWindow : Window, ISplashScreen
{
    private TextBlock? _messageTextBlock;
    private ProgressBar? _progressBar;

    public SplashScreenWindow()
    {
        InitializeComponent();

        // 컨트롤 참조 가져오기
        _messageTextBlock = FindName("MessageTextBlock") as TextBlock;
        _progressBar = FindName("ProgressBar") as ProgressBar;
    }

    /// <summary>
    ///     스플래시 화면이 현재 표시 중인지 여부
    ///     (ISplashScreen.IsVisible 명시적 구현)
    /// </summary>
    bool ISplashScreen.IsVisible => base.IsVisible;

    /// <summary>
    ///     진행 상태 업데이트
    /// </summary>
    public void UpdateProgress(string message, double? progress = null)
    {
        Dispatcher.Invoke(() =>
        {
            if (_messageTextBlock != null)
                _messageTextBlock.Text = message;

            if (_progressBar != null && progress.HasValue)
                _progressBar.Value = progress.Value * 100;
        });
    }
}
