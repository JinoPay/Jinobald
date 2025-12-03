using Avalonia.Controls;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Threading;
using Jinobald.Avalonia.Hosting;
using Jinobald.Core.Application;
using Jinobald.Core.Ioc;
using Jinobald.Core.Services.Regions;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using AvaloniaRegion = Jinobald.Avalonia.Services.Regions.Region;

namespace Jinobald.Avalonia.Application;

/// <summary>
///     Avalonia 애플리케이션의 기본 클래스 (스플래시 없음)
///     App.axaml.cs에서 이 클래스를 상속받아 사용합니다.
/// </summary>
/// <typeparam name="TMainWindow">메인 윈도우 타입</typeparam>
/// <example>
/// <code>
/// public partial class App : ApplicationBase&lt;MainWindow&gt;
/// {
///     protected override void RegisterTypes(IContainerRegistry containerRegistry)
///     {
///         containerRegistry.RegisterForNavigation&lt;HomeView&gt;();
///     }
/// }
/// </code>
/// </example>
public abstract class ApplicationBase<TMainWindow> : global::Avalonia.Application, IApplicationLifecycle
    where TMainWindow : Window
{
    /// <summary>
    ///     DI 컨테이너
    /// </summary>
    protected IContainerExtension? Container { get; private set; }

    /// <summary>
    ///     로거
    /// </summary>
    protected ILogger Logger { get; }

    protected ApplicationBase()
    {
        Logger = Log.ForContext(GetType());
        ConfigureExceptionHandling();
    }

    /// <summary>
    ///     Avalonia 프레임워크 초기화 완료 시 호출
    /// </summary>
    public override async void OnFrameworkInitializationCompleted()
    {
        await InitializeAsync();
        base.OnFrameworkInitializationCompleted();
    }

    /// <summary>
    ///     애플리케이션 초기화
    /// </summary>
    private async Task InitializeAsync()
    {
        Logger.Information("애플리케이션 초기화 시작");

        try
        {
            // 1. 로거 설정
            ConfigureLogging();

            // 2. DI 컨테이너 생성 및 설정
            var services = new ServiceCollection();
            services.AddJinobaldAvalonia();
            services.AddTransient<TMainWindow>();

            // 3. 컨테이너 빌드
            Container = services.AsContainerExtension();
            RegisterTypes(Container);
            Container.FinalizeExtension();
            ContainerLocator.SetContainerExtension(Container);

            // 4. 애플리케이션별 초기화
            await OnInitializeAsync();

            // 5. 메인 윈도우 생성 및 표시
            await CreateAndShowMainWindowAsync();

            // 6. Region 기본 View 설정
            var regionManager = Container.Resolve<IRegionManager>();
            ConfigureRegions(regionManager);

            Logger.Information("애플리케이션 초기화 완료");
        }
        catch (Exception ex)
        {
            Logger.Error(ex, "애플리케이션 초기화 중 오류 발생");
            throw;
        }
    }

    /// <summary>
    ///     로거 설정
    /// </summary>
    protected virtual void ConfigureLogging()
    {
        if (Log.Logger == Serilog.Core.Logger.None)
        {
            Log.Logger = new LoggerConfiguration()
                .MinimumLevel.Debug()
                .WriteTo.Console()
                .WriteTo.File("logs/jinobald-.log", rollingInterval: RollingInterval.Day)
                .CreateLogger();
        }
    }

    /// <summary>
    ///     DI 컨테이너에 서비스를 등록합니다.
    /// </summary>
    public virtual void RegisterTypes(IContainerRegistry containerRegistry)
    {
    }

    /// <summary>
    ///     Region에 기본 View를 등록합니다.
    /// </summary>
    public virtual void ConfigureRegions(IRegionManager regionManager)
    {
    }

    /// <summary>
    ///     애플리케이션별 초기화 로직
    /// </summary>
    public virtual Task OnInitializeAsync()
    {
        return Task.CompletedTask;
    }

    /// <summary>
    ///     애플리케이션별 초기화 로직 (Progress 버전 - 스플래시 있는 버전에서 사용)
    /// </summary>
    public virtual Task OnInitializeAsync(IProgress<InitializationProgress> progress)
    {
        return OnInitializeAsync();
    }

    /// <summary>
    ///     메인 윈도우를 생성하고 표시합니다.
    /// </summary>
    protected virtual async Task CreateAndShowMainWindowAsync()
    {
        if (Container == null)
            throw new InvalidOperationException("Container가 초기화되지 않았습니다.");

        if (ApplicationLifetime is not IClassicDesktopStyleApplicationLifetime desktop)
            return;

        await Dispatcher.UIThread.InvokeAsync(() =>
        {
            desktop.MainWindow = CreateMainWindow();

            if (desktop.MainWindow != null)
            {
                var regionManager = Container.Resolve<IRegionManager>();
                AvaloniaRegion.SetManager(desktop.MainWindow, regionManager);
            }

            desktop.MainWindow?.Show();
            Logger.Information("메인 윈도우 표시됨: {WindowType}", desktop.MainWindow?.GetType().Name);
        });

        if (desktop.MainWindow != null)
            await OnMainWindowShownAsync(desktop.MainWindow);
    }

    /// <summary>
    ///     메인 윈도우를 생성합니다.
    /// </summary>
    protected virtual Window CreateMainWindow()
    {
        if (Container == null)
            throw new InvalidOperationException("Container가 초기화되지 않았습니다.");

        return Container.Resolve<TMainWindow>();
    }

    /// <summary>
    ///     메인 윈도우가 표시된 후 호출되는 메서드
    /// </summary>
    protected virtual Task OnMainWindowShownAsync(Window mainWindow)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    ///     전역 예외 처리 설정
    /// </summary>
    protected virtual void ConfigureExceptionHandling()
    {
        AppDomain.CurrentDomain.UnhandledException += OnUnhandledException;
        TaskScheduler.UnobservedTaskException += OnUnobservedTaskException;
    }

    protected virtual void OnUnhandledException(object sender, UnhandledExceptionEventArgs e)
    {
        if (e.ExceptionObject is Exception ex)
        {
            Logger.Fatal(ex, "처리되지 않은 예외 발생");
            HandleUnhandledException(ex, e.IsTerminating);
        }
    }

    protected virtual void OnUnobservedTaskException(object? sender, UnobservedTaskExceptionEventArgs e)
    {
        Logger.Error(e.Exception, "관찰되지 않은 Task 예외 발생");
        e.SetObserved();
        HandleUnobservedTaskException(e.Exception);
    }

    protected virtual void HandleUnhandledException(Exception exception, bool isTerminating)
    {
    }

    protected virtual void HandleUnobservedTaskException(Exception exception)
    {
    }
}

/// <summary>
///     Avalonia 애플리케이션의 기본 클래스 (스플래시 포함)
///     App.axaml.cs에서 이 클래스를 상속받아 사용합니다.
/// </summary>
/// <typeparam name="TMainWindow">메인 윈도우 타입</typeparam>
/// <typeparam name="TSplashWindow">스플래시 윈도우 타입 (ISplashScreen 구현 필요)</typeparam>
/// <example>
/// <code>
/// public partial class App : ApplicationBase&lt;MainWindow, SplashScreenWindow&gt;
/// {
///     protected override void RegisterTypes(IContainerRegistry containerRegistry)
///     {
///         containerRegistry.RegisterForNavigation&lt;HomeView&gt;();
///     }
///
///     protected override Task OnInitializeAsync(IProgress&lt;InitializationProgress&gt; progress)
///     {
///         progress.Report(new("테마 로딩 중...", 50));
///         // 초기화 로직
///         progress.Report(new("완료!", 100));
///         return Task.CompletedTask;
///     }
/// }
/// </code>
/// </example>
public abstract class ApplicationBase<TMainWindow, TSplashWindow> : global::Avalonia.Application, IApplicationLifecycle
    where TMainWindow : Window
    where TSplashWindow : Window, ISplashScreen, new()
{
    /// <summary>
    ///     DI 컨테이너
    /// </summary>
    protected IContainerExtension? Container { get; private set; }

    /// <summary>
    ///     스플래시 화면
    /// </summary>
    protected ISplashScreen? SplashScreen { get; private set; }

    /// <summary>
    ///     로거
    /// </summary>
    protected ILogger Logger { get; }

    protected ApplicationBase()
    {
        Logger = Log.ForContext(GetType());
        ConfigureExceptionHandling();
    }

    /// <summary>
    ///     Avalonia 프레임워크 초기화 완료 시 호출
    /// </summary>
    public override async void OnFrameworkInitializationCompleted()
    {
        await InitializeAsync();
        base.OnFrameworkInitializationCompleted();
    }

    /// <summary>
    ///     애플리케이션 초기화
    /// </summary>
    private async Task InitializeAsync()
    {
        Logger.Information("애플리케이션 초기화 시작");

        try
        {
            // 1. 로거 설정
            ConfigureLogging();

            // 2. 스플래시 화면 생성 및 표시
            SplashScreen = CreateSplashScreen();
            SplashScreen.Show();
            SplashScreen.UpdateProgress("서비스 초기화 중...", null);

            // 3. DI 컨테이너 생성 및 설정
            var services = new ServiceCollection();
            services.AddJinobaldAvalonia();
            services.AddTransient<TMainWindow>();

            // 4. 컨테이너 빌드
            Container = services.AsContainerExtension();
            RegisterTypes(Container);
            SplashScreen.UpdateProgress("서비스 등록 중...", 30);

            Container.FinalizeExtension();
            ContainerLocator.SetContainerExtension(Container);
            SplashScreen.UpdateProgress("서비스 구성 완료", 50);

            // 5. 애플리케이션별 초기화 (Progress 콜백 전달)
            var progress = new Progress<InitializationProgress>(p =>
            {
                SplashScreen.UpdateProgress(p.Message, p.Percent);
            });
            await OnInitializeAsync(progress);

            // 6. 메인 윈도우 생성 및 표시
            SplashScreen.UpdateProgress("메인 화면 로드 중...", 90);
            await CreateAndShowMainWindowAsync();

            // 7. Region 기본 View 설정
            var regionManager = Container.Resolve<IRegionManager>();
            ConfigureRegions(regionManager);

            // 8. 스플래시 화면 닫기
            SplashScreen.Close();

            Logger.Information("애플리케이션 초기화 완료");
        }
        catch (Exception ex)
        {
            Logger.Error(ex, "애플리케이션 초기화 중 오류 발생");
            SplashScreen?.Close();
            throw;
        }
    }

    /// <summary>
    ///     로거 설정
    /// </summary>
    protected virtual void ConfigureLogging()
    {
        if (Log.Logger == Serilog.Core.Logger.None)
        {
            Log.Logger = new LoggerConfiguration()
                .MinimumLevel.Debug()
                .WriteTo.Console()
                .WriteTo.File("logs/jinobald-.log", rollingInterval: RollingInterval.Day)
                .CreateLogger();
        }
    }

    /// <summary>
    ///     DI 컨테이너에 서비스를 등록합니다.
    /// </summary>
    public virtual void RegisterTypes(IContainerRegistry containerRegistry)
    {
    }

    /// <summary>
    ///     Region에 기본 View를 등록합니다.
    /// </summary>
    public virtual void ConfigureRegions(IRegionManager regionManager)
    {
    }

    /// <summary>
    ///     애플리케이션별 초기화 로직 (스플래시 없는 버전과 호환)
    /// </summary>
    public virtual Task OnInitializeAsync()
    {
        return Task.CompletedTask;
    }

    /// <summary>
    ///     애플리케이션별 초기화 로직 (Progress 콜백으로 스플래시 진행률 업데이트)
    /// </summary>
    /// <param name="progress">진행률 보고 콜백</param>
    /// <example>
    /// <code>
    /// protected override async Task OnInitializeAsync(IProgress&lt;InitializationProgress&gt; progress)
    /// {
    ///     progress.Report(new("테마 로딩 중...", 60));
    ///     await LoadThemesAsync();
    ///
    ///     progress.Report(new("데이터 로딩 중...", 80));
    ///     await LoadDataAsync();
    /// }
    /// </code>
    /// </example>
    public virtual Task OnInitializeAsync(IProgress<InitializationProgress> progress)
    {
        return OnInitializeAsync();
    }

    /// <summary>
    ///     스플래시 화면을 생성합니다.
    /// </summary>
    protected virtual ISplashScreen CreateSplashScreen()
    {
        return new TSplashWindow();
    }

    /// <summary>
    ///     메인 윈도우를 생성하고 표시합니다.
    /// </summary>
    protected virtual async Task CreateAndShowMainWindowAsync()
    {
        if (Container == null)
            throw new InvalidOperationException("Container가 초기화되지 않았습니다.");

        if (ApplicationLifetime is not IClassicDesktopStyleApplicationLifetime desktop)
            return;

        await Dispatcher.UIThread.InvokeAsync(() =>
        {
            desktop.MainWindow = CreateMainWindow();

            if (desktop.MainWindow != null)
            {
                var regionManager = Container.Resolve<IRegionManager>();
                AvaloniaRegion.SetManager(desktop.MainWindow, regionManager);
            }

            desktop.MainWindow?.Show();
            Logger.Information("메인 윈도우 표시됨: {WindowType}", desktop.MainWindow?.GetType().Name);
        });

        if (desktop.MainWindow != null)
            await OnMainWindowShownAsync(desktop.MainWindow);
    }

    /// <summary>
    ///     메인 윈도우를 생성합니다.
    /// </summary>
    protected virtual Window CreateMainWindow()
    {
        if (Container == null)
            throw new InvalidOperationException("Container가 초기화되지 않았습니다.");

        return Container.Resolve<TMainWindow>();
    }

    /// <summary>
    ///     메인 윈도우가 표시된 후 호출되는 메서드
    /// </summary>
    protected virtual Task OnMainWindowShownAsync(Window mainWindow)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    ///     전역 예외 처리 설정
    /// </summary>
    protected virtual void ConfigureExceptionHandling()
    {
        AppDomain.CurrentDomain.UnhandledException += OnUnhandledException;
        TaskScheduler.UnobservedTaskException += OnUnobservedTaskException;
    }

    protected virtual void OnUnhandledException(object sender, UnhandledExceptionEventArgs e)
    {
        if (e.ExceptionObject is Exception ex)
        {
            Logger.Fatal(ex, "처리되지 않은 예외 발생");
            HandleUnhandledException(ex, e.IsTerminating);
        }
    }

    protected virtual void OnUnobservedTaskException(object? sender, UnobservedTaskExceptionEventArgs e)
    {
        Logger.Error(e.Exception, "관찰되지 않은 Task 예외 발생");
        e.SetObserved();
        HandleUnobservedTaskException(e.Exception);
    }

    protected virtual void HandleUnhandledException(Exception exception, bool isTerminating)
    {
    }

    protected virtual void HandleUnobservedTaskException(Exception exception)
    {
    }
}
