using System;
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
    ///     진행 상태 업데이트 (새 API)
    /// </summary>
    public void UpdateProgress(string message, int? percent)
    {
        Dispatcher.Invoke(() =>
        {
            if (_messageTextBlock != null)
                _messageTextBlock.Text = message;

            if (_progressBar != null)
            {
                if (percent.HasValue)
                {
                    _progressBar.IsIndeterminate = false;
                    _progressBar.Value = percent.Value;
                }
                else
                {
                    _progressBar.IsIndeterminate = true;
                }
            }
        });
    }

    /// <summary>
    ///     진행 상태 업데이트 (기존 API 호환)
    /// </summary>
    [Obsolete("Use UpdateProgress(string, int?) instead")]
    public void UpdateProgress(string message, double? progress)
    {
        UpdateProgress(message, progress.HasValue ? (int)(progress.Value * 100) : null);
    }
}
