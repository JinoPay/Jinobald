using System;
using Jinobald.Events;

namespace Jinobald.Sample.Wpf.Events;

/// <summary>
///     메시지 전송 이벤트
/// </summary>
public class MessageSentEvent : PubSubEvent
{
    public string Message { get; set; } = string.Empty;
    public DateTime SentAt { get; set; } = DateTime.Now;
    public string Sender { get; set; } = string.Empty;
}

/// <summary>
///     카운터 변경 이벤트
/// </summary>
public class CounterChangedEvent : PubSubEvent
{
    public int Count { get; set; }
    public string Source { get; set; } = string.Empty;
}

/// <summary>
///     상태 업데이트 이벤트
/// </summary>
public class StatusUpdatedEvent : PubSubEvent
{
    public string Status { get; set; } = string.Empty;
    public bool IsOnline { get; set; }
}
