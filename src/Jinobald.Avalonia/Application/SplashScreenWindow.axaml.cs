using Avalonia.Controls;
using Avalonia.Threading;
using Jinobald.Core.Application;

namespace Jinobald.Avalonia.Application;

/// <summary>
///     기본 스플래시 화면 윈도우
/// </summary>
public partial class SplashScreenWindow : Window, ISplashScreen
{
    public SplashScreenWindow()
    {
        InitializeComponent();
    }

    /// <inheritdoc />
    public new void Show()
    {
        Dispatcher.UIThread.Post(() => base.Show());
    }

    /// <inheritdoc />
    public new void Close()
    {
        Dispatcher.UIThread.Post(() =>
        {
            if (IsVisible)
                base.Close();
        });
    }

    /// <inheritdoc />
    public void UpdateProgress(string message, double? progress = null)
    {
        Dispatcher.UIThread.Post(() =>
        {
            // 메시지 업데이트
            if (MessageTextBlock != null)
                MessageTextBlock.Text = message;

            // 진행률 업데이트
            if (progress.HasValue && ProgressBar != null)
            {
                ProgressBar.Value = progress.Value * 100; // 0.0~1.0을 0~100으로 변환
            }
        });
    }

    /// <inheritdoc />
    bool ISplashScreen.IsVisible => IsVisible;
}
