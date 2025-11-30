using Avalonia.Threading;
using Jinobald.Avalonia.Hosting;
using Jinobald.Core.Application;
using Microsoft.Extensions.DependencyInjection;

namespace Jinobald.Avalonia.Application;

/// <summary>
///     Avalonia 애플리케이션 호스트
///     ApplicationBase를 상속받아 Avalonia에 특화된 구현을 제공합니다.
/// </summary>
/// <typeparam name="TMainWindow">메인 윈도우 타입</typeparam>
public abstract class AvaloniaApplicationHost<TMainWindow> : ApplicationBase
    where TMainWindow : global::Avalonia.Controls.Window
{
    private TMainWindow? _mainWindow;

    /// <summary>
    ///     메인 윈도우
    /// </summary>
    public TMainWindow? MainWindow => _mainWindow;

    /// <summary>
    ///     DI 컨테이너에 Jinobald Avalonia 서비스를 등록합니다.
    ///     파생 클래스에서 오버라이드하여 추가 서비스를 등록할 수 있습니다.
    /// </summary>
    protected override void ConfigureServices(IServiceCollection services)
    {
        // Jinobald Avalonia 핵심 서비스 등록
        services.AddJinobaldAvalonia();

        // 메인 윈도우 등록
        services.AddTransient<TMainWindow>();

        // 파생 클래스에서 추가 서비스 등록
        OnConfigureServices(services);
    }

    /// <summary>
    ///     파생 클래스에서 추가 서비스를 등록할 수 있는 메서드
    /// </summary>
    /// <param name="services">서비스 컬렉션</param>
    protected virtual void OnConfigureServices(IServiceCollection services)
    {
        // 파생 클래스에서 구현
    }

    /// <summary>
    ///     메인 윈도우를 생성하고 표시합니다.
    /// </summary>
    protected override async Task CreateAndShowMainWindowAsync()
    {
        if (Container == null)
            throw new InvalidOperationException("Container가 초기화되지 않았습니다.");

        // UI 쓰레드에서 메인 윈도우 생성 및 표시
        await Dispatcher.UIThread.InvokeAsync(() =>
        {
            _mainWindow = Container.Resolve<TMainWindow>();
            _mainWindow.Show();

            Logger.Information("메인 윈도우 표시됨: {WindowType}", typeof(TMainWindow).Name);
        });

        // 메인 윈도우 표시 후 추가 초기화
        if (_mainWindow != null)
            await OnMainWindowShownAsync(_mainWindow);
    }

    /// <summary>
    ///     메인 윈도우가 표시된 후 호출되는 메서드
    ///     파생 클래스에서 추가 초기화 로직을 구현할 수 있습니다.
    /// </summary>
    /// <param name="mainWindow">메인 윈도우</param>
    protected virtual Task OnMainWindowShownAsync(TMainWindow mainWindow)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    ///     Avalonia Application과 통합하여 앱을 초기화합니다.
    ///     App.axaml.cs의 OnFrameworkInitializationCompleted에서 호출하세요.
    /// </summary>
    public async Task RunAsync()
    {
        await InitializeAsync();
    }
}
