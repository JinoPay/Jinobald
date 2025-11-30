using CommunityToolkit.Mvvm.ComponentModel;
using Serilog;

namespace Jinobald.Core.Mvvm;

/// <summary>
///     모든 ViewModel의 기본 클래스
///     CommunityToolkit.Mvvm의 ObservableObject를 상속하고 추가 기능을 제공합니다.
/// </summary>
public abstract class ViewModelBase : ObservableObject, IDestructible
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

    /// <summary>
    ///     ViewModel 초기화 (비동기)
    ///     IInitializableAsync 인터페이스를 구현한 경우 자동 호출됩니다.
    /// </summary>
    protected virtual Task OnInitializeAsync()
    {
        IsInitialized = true;
        Logger.Debug("{ViewModelName} 초기화됨", GetType().Name);
        return Task.CompletedTask;
    }

    /// <summary>
    ///     ViewModel 활성화
    ///     IActivatable 인터페이스를 구현한 경우 자동 호출됩니다.
    /// </summary>
    protected virtual Task OnActivateAsync()
    {
        IsActive = true;
        Logger.Debug("{ViewModelName} 활성화됨", GetType().Name);
        return Task.CompletedTask;
    }

    /// <summary>
    ///     ViewModel 비활성화
    ///     IActivatable 인터페이스를 구현한 경우 자동 호출됩니다.
    /// </summary>
    protected virtual Task OnDeactivateAsync()
    {
        IsActive = false;
        Logger.Debug("{ViewModelName} 비활성화됨", GetType().Name);
        return Task.CompletedTask;
    }

    /// <summary>
    ///     리소스 정리
    /// </summary>
    public virtual void Destroy()
    {
        Logger.Debug("{ViewModelName} 정리됨", GetType().Name);
    }
}
