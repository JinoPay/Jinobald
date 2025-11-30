using System.Collections.Concurrent;
using System.Windows.Threading;
using Jinobald.Core.Services.Events;

namespace Jinobald.Wpf.Services.Events;

/// <summary>
///     이벤트 집계기 WPF 구현
///     Thread-safe한 Pub/Sub 패턴 구현
/// </summary>
public sealed class EventAggregator : IEventAggregator
{
    private readonly object _lock = new();
    private readonly ConcurrentDictionary<Type, List<Subscription>> _subscriptions = new();
    private readonly Dispatcher _dispatcher;

    public EventAggregator()
    {
        _dispatcher = Dispatcher.CurrentDispatcher;
    }

    public SubscriptionToken Subscribe<TEvent>(Action<TEvent> handler) where TEvent : class
    {
        return Subscribe(handler, ThreadOption.UIThread);
    }

    public SubscriptionToken Subscribe<TEvent>(Action<TEvent> handler, ThreadOption threadOption) where TEvent : class
    {
        return SubscribeInternal<TEvent>(handler, threadOption);
    }

    public SubscriptionToken Subscribe<TEvent>(Func<TEvent, Task> handler) where TEvent : class
    {
        return Subscribe(handler, ThreadOption.UIThread);
    }

    public SubscriptionToken Subscribe<TEvent>(Func<TEvent, Task> handler, ThreadOption threadOption)
        where TEvent : class
    {
        return SubscribeInternal<TEvent>(handler, threadOption);
    }

    public async Task PublishAsync<TEvent>(TEvent eventData) where TEvent : class
    {
        var eventType = typeof(TEvent);
        if (!_subscriptions.TryGetValue(eventType, out var subscriptions))
            return;

        List<Subscription> subscriptionsCopy;
        lock (_lock)
        {
            subscriptionsCopy = subscriptions.ToList();
        }

        var tasks = new List<Task>();

        foreach (var subscription in subscriptionsCopy)
        {
            var task = ExecuteHandlerAsync(subscription, eventData);
            if (task != null) tasks.Add(task);
        }

        if (tasks.Count > 0) await Task.WhenAll(tasks);
    }

    public void Publish<TEvent>(TEvent eventData) where TEvent : class
    {
        var eventType = typeof(TEvent);
        if (!_subscriptions.TryGetValue(eventType, out var subscriptions))
            return;

        List<Subscription> subscriptionsCopy;
        lock (_lock)
        {
            subscriptionsCopy = subscriptions.ToList();
        }

        foreach (var subscription in subscriptionsCopy) ExecuteHandler(subscription, eventData);
    }

    public void Unsubscribe(SubscriptionToken token)
    {
        if (!_subscriptions.TryGetValue(token.EventType, out var subscriptions))
            return;

        lock (_lock)
        {
            subscriptions.RemoveAll(s => s.Token.Id == token.Id);
        }
    }

    private SubscriptionToken SubscribeInternal<TEvent>(Delegate handler, ThreadOption threadOption)
        where TEvent : class
    {
        var eventType = typeof(TEvent);
        var token = new SubscriptionToken(eventType, Unsubscribe);

        var subscription = new Subscription
        {
            Token = token,
            Handler = handler,
            ThreadOption = threadOption
        };

        lock (_lock)
        {
            var subscriptions = _subscriptions.GetOrAdd(eventType, _ => new List<Subscription>());
            subscriptions.Add(subscription);
        }

        return token;
    }

    private async Task InvokeHandlerAsync<TEvent>(Delegate handler, TEvent eventData) where TEvent : class
    {
        try
        {
            if (handler is Action<TEvent> syncHandler)
                syncHandler(eventData);
            else if (handler is Func<TEvent, Task> asyncHandler) await asyncHandler(eventData);
        }
        catch
        {
            // Suppress exceptions in event handlers
        }
    }

    private Task? ExecuteHandlerAsync<TEvent>(Subscription subscription, TEvent eventData) where TEvent : class
    {
        try
        {
            return subscription.ThreadOption switch
            {
                ThreadOption.PublisherThread => InvokeHandlerAsync(subscription.Handler, eventData),

                ThreadOption.UIThread => _dispatcher.InvokeAsync(async () =>
                    await InvokeHandlerAsync(subscription.Handler, eventData)).Task,

                ThreadOption.BackgroundThread => Task.Run(() => InvokeHandlerAsync(subscription.Handler, eventData)),

                _ => null
            };
        }
        catch
        {
            return Task.CompletedTask;
        }
    }

    private void ExecuteHandler<TEvent>(Subscription subscription, TEvent eventData) where TEvent : class
    {
        try
        {
            switch (subscription.ThreadOption)
            {
                case ThreadOption.PublisherThread:
                    InvokeHandler(subscription.Handler, eventData);
                    break;

                case ThreadOption.UIThread:
                    _dispatcher.BeginInvoke(() => InvokeHandler(subscription.Handler, eventData));
                    break;

                case ThreadOption.BackgroundThread:
                    ThreadPool.QueueUserWorkItem(_ => InvokeHandler(subscription.Handler, eventData));
                    break;
            }
        }
        catch
        {
            // Suppress exceptions
        }
    }

    private void InvokeHandler<TEvent>(Delegate handler, TEvent eventData) where TEvent : class
    {
        try
        {
            if (handler is Action<TEvent> syncHandler)
                syncHandler(eventData);
            else if (handler is Func<TEvent, Task> asyncHandler) _ = asyncHandler(eventData);
        }
        catch
        {
            // Suppress exceptions
        }
    }

    private sealed class Subscription
    {
        public required Delegate Handler { get; init; }
        public required SubscriptionToken Token { get; init; }
        public ThreadOption ThreadOption { get; init; }
    }
}
