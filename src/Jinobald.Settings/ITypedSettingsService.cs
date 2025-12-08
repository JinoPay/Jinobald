namespace Jinobald.Settings;

/// <summary>
///     Strongly-Typed 설정 관리 서비스
///     컴파일 타임 타입 안전성과 IntelliSense 지원을 제공합니다.
/// </summary>
/// <typeparam name="TSettings">설정 POCO 클래스 타입</typeparam>
public interface ITypedSettingsService<TSettings> : IDisposable
    where TSettings : class, new()
{
    /// <summary>
    ///     현재 설정 값을 가져옵니다.
    ///     이 객체를 직접 수정하지 마세요. Update() 메서드를 사용하세요.
    /// </summary>
    TSettings Value { get; }

    /// <summary>
    ///     설정 값이 변경되었을 때 발생하는 이벤트
    /// </summary>
    event Action<TSettings>? SettingsChanged;

    /// <summary>
    ///     설정 값을 업데이트합니다.
    ///     변경 사항은 자동으로 저장되고 SettingsChanged 이벤트가 발생합니다.
    /// </summary>
    /// <param name="updateAction">설정을 수정하는 액션</param>
    void Update(Action<TSettings> updateAction);

    /// <summary>
    ///     설정 값을 비동기로 업데이트합니다.
    ///     변경 사항은 자동으로 저장되고 SettingsChanged 이벤트가 발생합니다.
    /// </summary>
    /// <param name="updateAction">설정을 수정하는 비동기 함수</param>
    Task UpdateAsync(Func<TSettings, Task> updateAction);

    /// <summary>
    ///     설정을 기본값으로 초기화합니다.
    ///     변경 사항은 자동으로 저장되고 SettingsChanged 이벤트가 발생합니다.
    /// </summary>
    void Reset();

    /// <summary>
    ///     설정을 디스크에 명시적으로 저장합니다.
    ///     (Update() 메서드는 자동 저장하므로 일반적으로 호출할 필요 없음)
    /// </summary>
    Task SaveAsync();

    /// <summary>
    ///     설정을 디스크에서 다시 로드합니다.
    ///     SettingsChanged 이벤트가 발생합니다.
    /// </summary>
    Task ReloadAsync();
}
