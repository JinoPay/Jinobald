namespace Jinobald.Core.Services.Events;

/// <summary>
///     이벤트 핸들러 실행 스레드 옵션
/// </summary>
public enum ThreadOption
{
    /// <summary>
    ///     이벤트를 발행한 스레드에서 실행 (동기)
    /// </summary>
    PublisherThread,

    /// <summary>
    ///     UI 스레드에서 실행 (Dispatcher.UIThread)
    /// </summary>
    UIThread,

    /// <summary>
    ///     백그라운드 스레드에서 실행 (ThreadPool)
    /// </summary>
    BackgroundThread
}

/// <summary>
///     이벤트 집계기 인터페이스
///     Pub/Sub 패턴으로 느슨한 결합의 컴포넌트 간 통신을 지원
/// </summary>
public interface IEventAggregator
{
    /// <summary>
    ///     이벤트 구독 (기본: UI 스레드)
    /// </summary>
    /// <typeparam name="TEvent">이벤트 타입</typeparam>
    /// <param name="handler">이벤트 핸들러</param>
    /// <returns>구독 해제를 위한 토큰</returns>
    SubscriptionToken Subscribe<TEvent>(Action<TEvent> handler) where TEvent : class;

    /// <summary>
    ///     이벤트 구독 (스레드 옵션 지정)
    /// </summary>
    SubscriptionToken Subscribe<TEvent>(Action<TEvent> handler, ThreadOption threadOption) where TEvent : class;

    /// <summary>
    ///     비동기 이벤트 구독 (기본: UI 스레드)
    /// </summary>
    SubscriptionToken Subscribe<TEvent>(Func<TEvent, Task> handler) where TEvent : class;

    /// <summary>
    ///     비동기 이벤트 구독 (스레드 옵션 지정)
    /// </summary>
    SubscriptionToken Subscribe<TEvent>(Func<TEvent, Task> handler, ThreadOption threadOption) where TEvent : class;

    /// <summary>
    ///     이벤트를 비동기로 발행
    /// </summary>
    Task PublishAsync<TEvent>(TEvent eventData) where TEvent : class;

    /// <summary>
    ///     이벤트를 발행
    /// </summary>
    /// <typeparam name="TEvent">이벤트 타입</typeparam>
    /// <param name="eventData">이벤트 데이터</param>
    void Publish<TEvent>(TEvent eventData) where TEvent : class;

    /// <summary>
    ///     이벤트 구독 해제
    /// </summary>
    void Unsubscribe(SubscriptionToken token);
}

/// <summary>
///     구독 해제를 위한 토큰
/// </summary>
public sealed class SubscriptionToken(Type eventType, Action<SubscriptionToken> unsubscribeAction)
    : IDisposable
{
    private bool _disposed;

    public Guid Id { get; } = Guid.NewGuid();
    public Type EventType { get; } = eventType;

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        unsubscribeAction(this);
    }
}
