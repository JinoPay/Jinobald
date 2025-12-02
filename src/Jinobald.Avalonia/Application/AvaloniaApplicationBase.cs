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
///     Avalonia 애플리케이션의 기본 클래스
///     App.axaml.cs에서 이 클래스를 상속받아 사용합니다.
/// </summary>
/// <typeparam name="TMainWindow">메인 윈도우 타입</typeparam>
/// <typeparam name="TSplashWindow">스플래시 윈도우 타입 (ISplashScreen 구현 필요)</typeparam>
public abstract class AvaloniaApplicationBase<TMainWindow, TSplashWindow> : global::Avalonia.Application
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

    protected AvaloniaApplicationBase()
    {
        Logger = Log.ForContext(GetType());
        ConfigureExceptionHandling();
    }

    /// <summary>
    ///     Avalonia 프레임워크 초기화 완료 시 호출
    ///     이 메서드에서 Jinobald 초기화를 수행합니다.
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
        Console.WriteLine("[Jinobald] 애플리케이션 초기화 시작");
        Logger.Information("애플리케이션 초기화 시작");

        try
        {
            // 1. 로거 설정
            ConfigureLogging();

            // 2. 스플래시 화면 생성 및 표시
            Console.WriteLine("[Jinobald] 스플래시 화면 생성");
            SplashScreen = CreateSplashScreen();
            if (SplashScreen == null)
                throw new InvalidOperationException("스플래시 화면을 생성할 수 없습니다. CreateSplashScreen()을 구현하세요.");

            Console.WriteLine("[Jinobald] 스플래시 화면 표시");
            SplashScreen.Show();
            SplashScreen.UpdateProgress("서비스 초기화 중...", 0.1);

            // 3. DI 컨테이너 생성 및 설정
            var services = new ServiceCollection();

            // Jinobald Avalonia 서비스 자동 등록
            services.AddJinobaldAvalonia();

            // 메인 윈도우 타입 등록
            services.AddTransient<TMainWindow>();

            // 사용자 정의 서비스 등록 (IServiceCollection 방식 - deprecated)
            ConfigureServices(services);

            // 4. 컨테이너 빌드 (RegisterTypes 전에 빌드하여 IContainerRegistry 사용 가능하게 함)
            Container = services.AsContainerExtension();

            // 사용자 정의 서비스 등록 (Prism 스타일 - 권장)
            RegisterTypes(Container);
            SplashScreen.UpdateProgress("서비스 등록 중...", 0.3);
            Container.FinalizeExtension();
            ContainerLocator.SetContainerExtension(Container);
            SplashScreen.UpdateProgress("서비스 구성 완료", 0.5);

            // 5. 애플리케이션별 초기화
            await OnInitializeAsync();
            SplashScreen.UpdateProgress("애플리케이션 구성 중...", 0.7);

            // 6. 메인 윈도우 생성
            await CreateAndShowMainWindowAsync();
            SplashScreen.UpdateProgress("메인 화면 로드 중...", 0.9);

            // 7. Region 기본 View 설정 (Prism 스타일)
            var regionManager = Container.Resolve<IRegionManager>();
            ConfigureRegions(regionManager);

            // 8. 스플래시 화면 닫기
            await Task.Delay(500); // 사용자가 진행 상황을 볼 수 있도록 짧은 지연
            SplashScreen.Close();

            Logger.Information("애플리케이션 초기화 완료");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Jinobald] 오류 발생: {ex.Message}");
            Console.WriteLine($"[Jinobald] 스택 트레이스: {ex.StackTrace}");
            Logger.Error(ex, "애플리케이션 초기화 중 오류 발생");
            SplashScreen?.Close();
            throw;
        }
    }

    /// <summary>
    ///     로거 설정
    ///     파생 클래스에서 Serilog 설정을 커스터마이즈할 수 있습니다.
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
    ///     DI 컨테이너에 서비스를 등록합니다. (Deprecated)
    ///     대신 RegisterTypes(IContainerRegistry)를 사용하세요.
    /// </summary>
    /// <param name="services">서비스 컬렉션</param>
    [Obsolete("Use RegisterTypes(IContainerRegistry) instead")]
    protected virtual void ConfigureServices(IServiceCollection services)
    {
        // 파생 클래스에서 오버라이드하여 추가 서비스 등록
    }

    /// <summary>
    ///     DI 컨테이너에 서비스를 등록합니다. (Prism 스타일)
    ///     파생 클래스에서 오버라이드하여 View/ViewModel을 등록합니다.
    /// </summary>
    /// <param name="containerRegistry">컨테이너 레지스트리</param>
    /// <example>
    /// <code>
    /// protected override void RegisterTypes(IContainerRegistry containerRegistry)
    /// {
    ///     // 네비게이션용 View/ViewModel 등록
    ///     containerRegistry.RegisterForNavigation&lt;HomeView, HomeViewModel&gt;();
    ///
    ///     // 다이얼로그 등록
    ///     containerRegistry.RegisterDialog&lt;MessageDialogView, MessageDialogViewModel&gt;();
    ///
    ///     // 서비스 등록
    ///     containerRegistry.RegisterSingleton&lt;IMyService, MyService&gt;();
    /// }
    /// </code>
    /// </example>
    protected virtual void RegisterTypes(IContainerRegistry containerRegistry)
    {
        // 파생 클래스에서 오버라이드하여 View/ViewModel 등록
    }

    /// <summary>
    ///     Region에 기본 View를 등록합니다. (Prism 스타일)
    ///     파생 클래스에서 오버라이드하여 Region의 기본 View를 설정합니다.
    /// </summary>
    /// <param name="regionManager">리전 매니저</param>
    /// <example>
    /// <code>
    /// protected override void ConfigureRegions(IRegionManager regionManager)
    /// {
    ///     regionManager.RegisterViewWithRegion&lt;HomeView&gt;("MainContentRegion");
    ///     regionManager.RegisterViewWithRegion&lt;SidebarView&gt;("SidebarRegion");
    /// }
    /// </code>
    /// </example>
    protected virtual void ConfigureRegions(IRegionManager regionManager)
    {
        // 파생 클래스에서 오버라이드하여 Region 기본 View 설정
    }

    /// <summary>
    ///     스플래시 화면을 생성합니다.
    /// </summary>
    /// <returns>스플래시 화면 인스턴스</returns>
    protected virtual ISplashScreen CreateSplashScreen()
    {
        return new TSplashWindow();
    }

    /// <summary>
    ///     메인 윈도우를 생성하고 표시합니다.
    /// </summary>
    private async Task CreateAndShowMainWindowAsync()
    {
        if (Container == null)
            throw new InvalidOperationException("Container가 초기화되지 않았습니다.");

        if (ApplicationLifetime is not IClassicDesktopStyleApplicationLifetime desktop)
            return;

        // UI 쓰레드에서 메인 윈도우 생성 및 표시
        await Dispatcher.UIThread.InvokeAsync(() =>
        {
            desktop.MainWindow = CreateMainWindow();

            // RegionManager를 MainWindow에 자동 연결 (Prism 스타일)
            if (desktop.MainWindow != null)
            {
                var regionManager = Container.Resolve<IRegionManager>();
                AvaloniaRegion.SetManager(desktop.MainWindow, regionManager);
            }

            desktop.MainWindow?.Show();
            Logger.Information("메인 윈도우 표시됨: {WindowType}", desktop.MainWindow?.GetType().Name);
        });

        // 메인 윈도우 표시 후 추가 초기화
        if (desktop.MainWindow != null)
            await OnMainWindowShownAsync(desktop.MainWindow);
    }

    /// <summary>
    ///     메인 윈도우를 생성합니다.
    ///     DI 컨테이너에서 resolve합니다.
    /// </summary>
    protected virtual Window CreateMainWindow()
    {
        if (Container == null)
            throw new InvalidOperationException("Container가 초기화되지 않았습니다.");

        return Container.Resolve<TMainWindow>();
    }

    /// <summary>
    ///     메인 윈도우가 표시된 후 호출되는 메서드
    ///     파생 클래스에서 필요시 오버라이드합니다.
    /// </summary>
    protected virtual Task OnMainWindowShownAsync(Window mainWindow)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    ///     애플리케이션별 초기화 로직
    ///     파생 클래스에서 필요시 오버라이드합니다.
    /// </summary>
    protected virtual Task OnInitializeAsync()
    {
        return Task.CompletedTask;
    }

    /// <summary>
    ///     전역 예외 처리 설정
    /// </summary>
    protected virtual void ConfigureExceptionHandling()
    {
        // AppDomain 예외 처리
        AppDomain.CurrentDomain.UnhandledException += OnUnhandledException;

        // Task 예외 처리
        TaskScheduler.UnobservedTaskException += OnUnobservedTaskException;
    }

    /// <summary>
    ///     처리되지 않은 예외 발생 시 호출
    /// </summary>
    protected virtual void OnUnhandledException(object sender, UnhandledExceptionEventArgs e)
    {
        if (e.ExceptionObject is Exception ex)
        {
            Logger.Fatal(ex, "처리되지 않은 예외 발생");
            HandleUnhandledException(ex, e.IsTerminating);
        }
    }

    /// <summary>
    ///     관찰되지 않은 Task 예외 발생 시 호출
    /// </summary>
    protected virtual void OnUnobservedTaskException(object? sender, UnobservedTaskExceptionEventArgs e)
    {
        Logger.Error(e.Exception, "관찰되지 않은 Task 예외 발생");
        e.SetObserved();
        HandleUnobservedTaskException(e.Exception);
    }

    /// <summary>
    ///     파생 클래스에서 처리되지 않은 예외 처리를 커스터마이즈합니다.
    /// </summary>
    protected virtual void HandleUnhandledException(Exception exception, bool isTerminating)
    {
        // 기본 구현: 로깅만 수행
    }

    /// <summary>
    ///     파생 클래스에서 관찰되지 않은 Task 예외 처리를 커스터마이즈합니다.
    /// </summary>
    protected virtual void HandleUnobservedTaskException(Exception exception)
    {
        // 기본 구현: 로깅만 수행
    }
}
