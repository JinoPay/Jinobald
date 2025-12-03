using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml.Styling;
using Avalonia.Styling;
using Avalonia.Threading;
using Avalonia.VisualTree;
using Jinobald.Avalonia.Controls;
using Jinobald.Avalonia.Hosting;
using Jinobald.Core.Application;
using Jinobald.Core.Ioc;
using Jinobald.Core.Services.Dialog;
using Jinobald.Core.Services.Regions;
using Jinobald.Core.Services.Toast;
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
///     public override void RegisterTypes(IContainerRegistry containerRegistry)
///     {
///         containerRegistry.RegisterForNavigation&lt;HomeView&gt;();
///     }
///
///     public override async Task OnInitializeAsync()
///     {
///         // 테마 설정 등 초기화 로직
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
        LoadDefaultStyles();
    }

    /// <summary>
    ///     기본 스타일 로드 (DialogHost, ToastHost 등)
    /// </summary>
    private void LoadDefaultStyles()
    {
        // DialogHost 스타일 자동 추가
        var dialogHostStyle = new StyleInclude(new System.Uri("avares://Jinobald.Avalonia/"))
        {
            Source = new System.Uri("avares://Jinobald.Avalonia/Controls/DialogHost.axaml")
        };
        Styles.Add(dialogHostStyle);

        // ToastHost 스타일 자동 추가
        var toastHostStyle = new StyleInclude(new System.Uri("avares://Jinobald.Avalonia/"))
        {
            Source = new System.Uri("avares://Jinobald.Avalonia/Controls/ToastHost.axaml")
        };
        Styles.Add(toastHostStyle);
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
    ///     IApplicationLifecycle 인터페이스 구현 (스플래시 없는 버전에서는 무시)
    /// </summary>
    Task IApplicationLifecycle.OnInitializeAsync(IProgress<InitializationProgress> progress)
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
        // DialogHost와 ToastHost를 자동으로 찾아서 등록
        AutoRegisterHosts(mainWindow);
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

    /// <summary>
    ///     Visual Tree를 탐색하여 DialogHost와 ToastHost를 자동으로 등록합니다.
    /// </summary>
    private void AutoRegisterHosts(Window mainWindow)
    {
        if (Container == null)
            return;

        try
        {
            // DialogHost 찾기 및 등록
            var dialogHost = FindVisualChild<DialogHost>(mainWindow);
            if (dialogHost != null)
            {
                var dialogService = Container.Resolve<IDialogService>();
                dialogService.RegisterHost(dialogHost);
                Logger.Information("DialogHost가 자동으로 등록되었습니다.");
            }
            else
            {
                Logger.Warning("MainWindow에서 DialogHost를 찾을 수 없습니다. 다이얼로그 기능이 작동하지 않을 수 있습니다.");
            }

            // ToastHost 찾기 및 등록
            var toastHost = FindVisualChild<ToastHost>(mainWindow);
            if (toastHost != null)
            {
                var toastService = Container.Resolve<IToastService>();
                toastService.RegisterHost(toastHost);
                Logger.Information("ToastHost가 자동으로 등록되었습니다.");
            }
            else
            {
                Logger.Warning("MainWindow에서 ToastHost를 찾을 수 없습니다. Toast 알림 기능이 작동하지 않을 수 있습니다.");
            }
        }
        catch (Exception ex)
        {
            Logger.Error(ex, "Host 자동 등록 중 오류 발생");
        }
    }

    /// <summary>
    ///     Visual Tree에서 특정 타입의 자식 컨트롤을 찾습니다.
    /// </summary>
    private static T? FindVisualChild<T>(Visual parent) where T : class
    {
        // 현재 노드가 찾고자 하는 타입인지 확인
        if (parent is T result)
            return result;

        // 자식 노드들을 순회하며 재귀적으로 검색
        foreach (var child in parent.GetVisualChildren())
        {
            var foundChild = FindVisualChild<T>(child);
            if (foundChild != null)
                return foundChild;
        }

        return null;
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
///     public override void RegisterTypes(IContainerRegistry containerRegistry)
///     {
///         containerRegistry.RegisterForNavigation&lt;HomeView&gt;();
///     }
///
///     public override async Task OnInitializeAsync(IProgress&lt;InitializationProgress&gt; progress)
///     {
///         progress.Report(new("테마 로딩 중...", 30));
///         await LoadThemesAsync();
///
///         progress.Report(new("데이터 로딩 중...", 70));
///         await LoadDataAsync();
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
        LoadDefaultStyles();
    }

    /// <summary>
    ///     기본 스타일 로드 (DialogHost, ToastHost 등)
    /// </summary>
    private void LoadDefaultStyles()
    {
        // DialogHost 스타일 자동 추가
        var dialogHostStyle = new StyleInclude(new System.Uri("avares://Jinobald.Avalonia/"))
        {
            Source = new System.Uri("avares://Jinobald.Avalonia/Controls/DialogHost.axaml")
        };
        Styles.Add(dialogHostStyle);

        // ToastHost 스타일 자동 추가
        var toastHostStyle = new StyleInclude(new System.Uri("avares://Jinobald.Avalonia/"))
        {
            Source = new System.Uri("avares://Jinobald.Avalonia/Controls/ToastHost.axaml")
        };
        Styles.Add(toastHostStyle);
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

            // 2. 스플래시 화면 생성 및 표시 (내부 초기화 중에는 indeterminate)
            SplashScreen = CreateSplashScreen();
            SplashScreen.Show();
            SplashScreen.UpdateProgress("초기화 중...", null);

            // 3. DI 컨테이너 생성 및 설정
            var services = new ServiceCollection();
            services.AddJinobaldAvalonia();
            services.AddTransient<TMainWindow>();

            // 4. 컨테이너 빌드
            Container = services.AsContainerExtension();
            RegisterTypes(Container);
            Container.FinalizeExtension();
            ContainerLocator.SetContainerExtension(Container);

            // 5. 애플리케이션별 초기화 (사용자가 Progress 제어)
            var progress = new Progress<InitializationProgress>(p =>
            {
                SplashScreen.UpdateProgress(p.Message, p.Percent);
            });
            await OnInitializeAsync(progress);

            // 6. 메인 윈도우 생성 및 표시
            SplashScreen.UpdateProgress("시작 중...", null);
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
    ///     IApplicationLifecycle 인터페이스 구현 (스플래시 버전에서는 Progress 버전 호출)
    /// </summary>
    Task IApplicationLifecycle.OnInitializeAsync()
    {
        return Task.CompletedTask;
    }

    /// <summary>
    ///     애플리케이션별 초기화 로직 (반드시 구현해야 함)
    ///     Progress 콜백을 통해 스플래시 화면의 진행률을 업데이트합니다.
    /// </summary>
    /// <param name="progress">진행률 보고 콜백</param>
    /// <example>
    /// <code>
    /// public override async Task OnInitializeAsync(IProgress&lt;InitializationProgress&gt; progress)
    /// {
    ///     progress.Report(new("테마 로딩 중...", 30));
    ///     await LoadThemesAsync();
    ///
    ///     progress.Report(new("데이터 로딩 중...", 70));
    ///     await LoadDataAsync();
    /// }
    /// </code>
    /// </example>
    public abstract Task OnInitializeAsync(IProgress<InitializationProgress> progress);

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
        // DialogHost와 ToastHost를 자동으로 찾아서 등록
        AutoRegisterHosts(mainWindow);
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

    /// <summary>
    ///     Visual Tree를 탐색하여 DialogHost와 ToastHost를 자동으로 등록합니다.
    /// </summary>
    private void AutoRegisterHosts(Window mainWindow)
    {
        if (Container == null)
            return;

        try
        {
            // DialogHost 찾기 및 등록
            var dialogHost = FindVisualChild<DialogHost>(mainWindow);
            if (dialogHost != null)
            {
                var dialogService = Container.Resolve<IDialogService>();
                dialogService.RegisterHost(dialogHost);
                Logger.Information("DialogHost가 자동으로 등록되었습니다.");
            }
            else
            {
                Logger.Warning("MainWindow에서 DialogHost를 찾을 수 없습니다. 다이얼로그 기능이 작동하지 않을 수 있습니다.");
            }

            // ToastHost 찾기 및 등록
            var toastHost = FindVisualChild<ToastHost>(mainWindow);
            if (toastHost != null)
            {
                var toastService = Container.Resolve<IToastService>();
                toastService.RegisterHost(toastHost);
                Logger.Information("ToastHost가 자동으로 등록되었습니다.");
            }
            else
            {
                Logger.Warning("MainWindow에서 ToastHost를 찾을 수 없습니다. Toast 알림 기능이 작동하지 않을 수 있습니다.");
            }
        }
        catch (Exception ex)
        {
            Logger.Error(ex, "Host 자동 등록 중 오류 발생");
        }
    }

    /// <summary>
    ///     Visual Tree에서 특정 타입의 자식 컨트롤을 찾습니다.
    /// </summary>
    private static T? FindVisualChild<T>(Visual parent) where T : class
    {
        // 현재 노드가 찾고자 하는 타입인지 확인
        if (parent is T result)
            return result;

        // 자식 노드들을 순회하며 재귀적으로 검색
        foreach (var child in parent.GetVisualChildren())
        {
            var foundChild = FindVisualChild<T>(child);
            if (foundChild != null)
                return foundChild;
        }

        return null;
    }
}
