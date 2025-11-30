using Jinobald.Core.Ioc;
using Microsoft.Extensions.DependencyInjection;
using Serilog;

namespace Jinobald.Core.Application;

/// <summary>
///     플랫폼 독립적인 애플리케이션 기본 클래스
///     WPF와 Avalonia 애플리케이션이 이 클래스를 상속받아 구현합니다.
/// </summary>
public abstract class ApplicationBase
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
    }

    /// <summary>
    ///     애플리케이션 초기화
    ///     이 메서드는 플랫폼별 애플리케이션 시작점에서 호출되어야 합니다.
    /// </summary>
    public async Task InitializeAsync()
    {
        Logger.Information("애플리케이션 초기화 시작");

        try
        {
            // 1. 로거 설정
            ConfigureLogging();

            // 2. 스플래시 화면 생성 및 표시
            SplashScreen = CreateSplashScreen();
            if (SplashScreen == null)
                throw new InvalidOperationException("스플래시 화면을 생성할 수 없습니다. CreateSplashScreen()을 구현하세요.");

            SplashScreen.Show();
            SplashScreen.UpdateProgress("서비스 초기화 중...", 0.1);

            // 3. DI 컨테이너 생성 및 설정
            var services = new ServiceCollection();
            ConfigureServices(services);
            SplashScreen.UpdateProgress("서비스 등록 중...", 0.3);

            // 4. 컨테이너 빌드
            Container = services.AsContainerExtension();
            Container.FinalizeExtension();
            ContainerLocator.SetContainerExtension(Container);
            SplashScreen.UpdateProgress("서비스 구성 완료", 0.5);

            // 5. 애플리케이션별 초기화
            await OnInitializeAsync();
            SplashScreen.UpdateProgress("애플리케이션 구성 중...", 0.7);

            // 6. 메인 윈도우 생성
            await CreateAndShowMainWindowAsync();
            SplashScreen.UpdateProgress("메인 화면 로드 중...", 0.9);

            // 7. 스플래시 화면 닫기
            await Task.Delay(500); // 사용자가 진행 상황을 볼 수 있도록 짧은 지연
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
    ///     DI 컨테이너에 서비스를 등록합니다.
    ///     파생 클래스에서 반드시 구현해야 합니다.
    /// </summary>
    /// <param name="services">서비스 컬렉션</param>
    protected abstract void ConfigureServices(IServiceCollection services);

    /// <summary>
    ///     스플래시 화면을 생성합니다.
    ///     파생 클래스에서 반드시 구현해야 합니다.
    /// </summary>
    /// <returns>스플래시 화면 인스턴스</returns>
    protected abstract ISplashScreen CreateSplashScreen();

    /// <summary>
    ///     메인 윈도우를 생성하고 표시합니다.
    ///     파생 클래스에서 반드시 구현해야 합니다.
    /// </summary>
    protected abstract Task CreateAndShowMainWindowAsync();

    /// <summary>
    ///     애플리케이션별 초기화 로직
    ///     파생 클래스에서 필요시 오버라이드합니다.
    /// </summary>
    protected virtual Task OnInitializeAsync()
    {
        return Task.CompletedTask;
    }

    /// <summary>
    ///     애플리케이션 종료 시 호출
    /// </summary>
    public virtual void OnExit()
    {
        Logger.Information("애플리케이션 종료");
        Log.CloseAndFlush();
    }
}
