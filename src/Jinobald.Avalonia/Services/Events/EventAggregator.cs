using System.Collections.Concurrent;
using Avalonia.Threading;
using Jinobald.Core.Services.Events;

namespace Jinobald.Avalonia.Services.Events;

/// <summary>
///     이벤트 집계기 구현
///     Thread-safe한 Pub/Sub 패턴 구현
/// </summary>
public sealed class EventAggregator : IEventAggregator
{
    private readonly object _lock = new();
    private readonly ConcurrentDictionary<Type, List<Subscription>> _subscriptions = new();
    private readonly ConcurrentDictionary<Type, object> _eventInstances = new();

    public PubSubEvent<TEvent> GetEvent<TEvent>() where TEvent : PubSubEvent
    {
        var eventType = typeof(TEvent);
        if (_eventInstances.TryGetValue(eventType, out var existingEvent))
            return (PubSubEvent<TEvent>)existingEvent;

        var newEvent = new PubSubEvent<TEvent>(this);
        _eventInstances[eventType] = newEvent;
        return newEvent;
    }

    public SubscriptionToken Subscribe<TEvent>(Action<TEvent> handler) where TEvent : PubSubEvent
    {
        return Subscribe(handler, ThreadOption.UIThread);
    }

    public SubscriptionToken Subscribe<TEvent>(Action<TEvent> handler, ThreadOption threadOption) where TEvent : PubSubEvent
    {
        return SubscribeInternal<TEvent>(handler, threadOption);
    }

    public SubscriptionToken Subscribe<TEvent>(Func<TEvent, Task> handler) where TEvent : PubSubEvent
    {
        return Subscribe(handler, ThreadOption.UIThread);
    }

    public SubscriptionToken Subscribe<TEvent>(Func<TEvent, Task> handler, ThreadOption threadOption)
        where TEvent : PubSubEvent
    {
        return SubscribeInternal<TEvent>(handler, threadOption);
    }

    public async Task PublishAsync<TEvent>(TEvent eventData) where TEvent : PubSubEvent
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

    public void Publish<TEvent>(TEvent eventData) where TEvent : PubSubEvent
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
        where TEvent : PubSubEvent
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

    private async Task InvokeHandlerAsync<TEvent>(Delegate handler, TEvent eventData) where TEvent : PubSubEvent
    {
        try
        {
            if (handler is Action<TEvent> syncHandler)
                syncHandler(eventData);
            else if (handler is Func<TEvent, Task> asyncHandler) await asyncHandler(eventData);
        }
        catch
        {
            // Suppress exceptions in event handlers to prevent breaking the event flow
        }
    }

    private Task? ExecuteHandlerAsync<TEvent>(Subscription subscription, TEvent eventData) where TEvent : PubSubEvent
    {
        try
        {
            return subscription.ThreadOption switch
            {
                ThreadOption.PublisherThread => InvokeHandlerAsync(subscription.Handler, eventData),

                ThreadOption.UIThread => Dispatcher.UIThread.InvokeAsync(async () =>
                    await InvokeHandlerAsync(subscription.Handler, eventData)),

                ThreadOption.BackgroundThread => Task.Run(() => InvokeHandlerAsync(subscription.Handler, eventData)),

                _ => null
            };
        }
        catch
        {
            return Task.CompletedTask;
        }
    }

    private void ExecuteHandler<TEvent>(Subscription subscription, TEvent eventData) where TEvent : PubSubEvent
    {
        try
        {
            switch (subscription.ThreadOption)
            {
                case ThreadOption.PublisherThread:
                    InvokeHandler(subscription.Handler, eventData);
                    break;

                case ThreadOption.UIThread:
                    Dispatcher.UIThread.Post(() => InvokeHandler(subscription.Handler, eventData));
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

    private void InvokeHandler<TEvent>(Delegate handler, TEvent eventData) where TEvent : PubSubEvent
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
