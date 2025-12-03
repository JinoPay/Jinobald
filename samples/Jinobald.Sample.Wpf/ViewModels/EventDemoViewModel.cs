using System;
using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Mvvm;
using Jinobald.Core.Services.Events;
using Jinobald.Sample.Wpf.Events;

namespace Jinobald.Sample.Wpf.ViewModels;

public partial class EventDemoViewModel : ViewModelBase
{
    private readonly IEventAggregator _eventAggregator;
    private int _counter;
    private string _messageToSend = string.Empty;
    private string _lastReceivedMessage = string.Empty;
    private bool _isOnline = true;

    public string Title => "Event Aggregator Demo";

    public ObservableCollection<string> EventLog { get; } = new();

    public int Counter
    {
        get => _counter;
        set => SetProperty(ref _counter, value);
    }

    public string MessageToSend
    {
        get => _messageToSend;
        set => SetProperty(ref _messageToSend, value);
    }

    public string LastReceivedMessage
    {
        get => _lastReceivedMessage;
        set => SetProperty(ref _lastReceivedMessage, value);
    }

    public bool IsOnline
    {
        get => _isOnline;
        set
        {
            if (SetProperty(ref _isOnline, value))
            {
                _eventAggregator.GetEvent<StatusUpdatedEvent>().Publish(new StatusUpdatedEvent
                {
                    Status = value ? "Online" : "Offline",
                    IsOnline = value
                });
            }
        }
    }

    public EventDemoViewModel(IEventAggregator eventAggregator)
    {
        _eventAggregator = eventAggregator;

        _eventAggregator.GetEvent<MessageSentEvent>()
            .Subscribe(OnMessageReceived, ThreadOption.UIThread);

        _eventAggregator.GetEvent<CounterChangedEvent>()
            .Subscribe(OnCounterChanged, ThreadOption.UIThread);

        _eventAggregator.GetEvent<StatusUpdatedEvent>()
            .Subscribe(OnStatusUpdated, ThreadOption.UIThread);

        AddLog("EventAggregator initialized.");
    }

    private void OnMessageReceived(MessageSentEvent e)
    {
        LastReceivedMessage = $"[{e.SentAt:HH:mm:ss}] {e.Sender}: {e.Message}";
        AddLog($"MessageSentEvent received: {e.Message}");
    }

    private void OnCounterChanged(CounterChangedEvent e)
    {
        Counter = e.Count;
        AddLog($"CounterChangedEvent received: {e.Count} (from {e.Source})");
    }

    private void OnStatusUpdated(StatusUpdatedEvent e)
    {
        AddLog($"StatusUpdatedEvent received: {e.Status} (Online: {e.IsOnline})");
    }

    [RelayCommand]
    private void SendMessage()
    {
        if (string.IsNullOrWhiteSpace(MessageToSend))
            return;

        var evt = new MessageSentEvent
        {
            Message = MessageToSend,
            Sender = "EventDemo",
            SentAt = DateTime.Now
        };

        _eventAggregator.GetEvent<MessageSentEvent>().Publish(evt);
        AddLog($"MessageSentEvent published: {MessageToSend}");
        MessageToSend = string.Empty;
    }

    [RelayCommand]
    private void IncrementCounter()
    {
        var newCount = Counter + 1;
        _eventAggregator.GetEvent<CounterChangedEvent>().Publish(new CounterChangedEvent
        {
            Count = newCount,
            Source = "IncrementButton"
        });
    }

    [RelayCommand]
    private void DecrementCounter()
    {
        var newCount = Counter - 1;
        _eventAggregator.GetEvent<CounterChangedEvent>().Publish(new CounterChangedEvent
        {
            Count = newCount,
            Source = "DecrementButton"
        });
    }

    [RelayCommand]
    private void ResetCounter()
    {
        _eventAggregator.GetEvent<CounterChangedEvent>().Publish(new CounterChangedEvent
        {
            Count = 0,
            Source = "ResetButton"
        });
    }

    [RelayCommand]
    private void ClearLog()
    {
        EventLog.Clear();
        AddLog("Log cleared.");
    }

    private void AddLog(string message)
    {
        var timestamp = DateTime.Now.ToString("HH:mm:ss.fff");
        EventLog.Insert(0, $"[{timestamp}] {message}");

        while (EventLog.Count > 50)
            EventLog.RemoveAt(EventLog.Count - 1);
    }

    protected override void OnDestroy(bool disposing)
    {
        if (disposing)
        {
            AddLog("EventDemoViewModel destroyed");
        }
        base.OnDestroy(disposing);
    }
}
