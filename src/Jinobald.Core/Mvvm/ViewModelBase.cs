using CommunityToolkit.Mvvm.ComponentModel;
using Serilog;

namespace Jinobald.Core.Mvvm;

/// <summary>
///     모든 ViewModel의 기본 클래스
///     CommunityToolkit.Mvvm의 ObservableObject를 상속하고 추가 기능을 제공합니다.
///     기본적으로 IInitializableAsync, IActivatable, IDestructible 인터페이스를 구현합니다.
/// </summary>
public abstract class ViewModelBase : ObservableObject,
    IInitializableAsync,
    IActivatable,
    IDestructible
{
    /// <summary>
    ///     로거 인스턴스
    /// </summary>
    protected ILogger Logger { get; }

    /// <summary>
    ///     ViewModel이 초기화되었는지 여부
    /// </summary>
    public bool IsInitialized { get; private set; }

    /// <summary>
    ///     ViewModel이 활성화되었는지 여부
    /// </summary>
    public bool IsActive { get; private set; }

    protected ViewModelBase()
    {
        Logger = Log.ForContext(GetType());
    }

    #region IInitializableAsync 구현

    /// <summary>
    ///     ViewModel 초기화 (비동기)
    ///     NavigationService에 의해 자동 호출됩니다.
    /// </summary>
    async Task IInitializableAsync.InitializeAsync(CancellationToken cancellationToken)
    {
        if (IsInitialized)
            return;

        await OnInitializeAsync(cancellationToken);
        IsInitialized = true;
        Logger.Debug("{ViewModelName} 초기화됨", GetType().Name);
    }

    /// <summary>
    ///     파생 클래스에서 초기화 로직을 구현합니다.
    /// </summary>
    protected virtual Task OnInitializeAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    #endregion

    #region IActivatable 구현

    /// <summary>
    ///     ViewModel 활성화
    ///     NavigationService에 의해 자동 호출됩니다.
    /// </summary>
    async Task IActivatable.ActivateAsync(CancellationToken cancellationToken)
    {
        await OnActivateAsync(cancellationToken);
        IsActive = true;
        Logger.Debug("{ViewModelName} 활성화됨", GetType().Name);
    }

    /// <summary>
    ///     ViewModel 비활성화
    ///     NavigationService에 의해 자동 호출됩니다.
    /// </summary>
    async Task IActivatable.DeactivateAsync(CancellationToken cancellationToken)
    {
        await OnDeactivateAsync(cancellationToken);
        IsActive = false;
        Logger.Debug("{ViewModelName} 비활성화됨", GetType().Name);
    }

    /// <summary>
    ///     파생 클래스에서 활성화 로직을 구현합니다.
    /// </summary>
    protected virtual Task OnActivateAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    ///     파생 클래스에서 비활성화 로직을 구현합니다.
    /// </summary>
    protected virtual Task OnDeactivateAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    #endregion

    #region IDestructible 구현

    /// <summary>
    ///     리소스 정리
    ///     NavigationService에 의해 자동 호출됩니다.
    /// </summary>
    public void Destroy()
    {
        OnDestroy();
        Logger.Debug("{ViewModelName} 정리됨", GetType().Name);
    }

    /// <summary>
    ///     파생 클래스에서 정리 로직을 구현합니다.
    /// </summary>
    protected virtual void OnDestroy()
    {
    }

    #endregion
}
