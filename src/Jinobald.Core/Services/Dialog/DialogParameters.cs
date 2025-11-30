namespace Jinobald.Core.Services.Dialog;

/// <summary>
///     다이얼로그 파라미터 구현
/// </summary>
public class DialogParameters : IDialogParameters
{
    private readonly Dictionary<string, object> _parameters = new();

    public DialogParameters()
    {
    }

    public DialogParameters(params (string Key, object Value)[] parameters)
    {
        foreach (var (key, value) in parameters)
        {
            Add(key, value);
        }
    }

    public void Add(string key, object value)
    {
        _parameters[key] = value;
    }

    public T? GetValue<T>(string key)
    {
        if (_parameters.TryGetValue(key, out var value))
        {
            return value is T typedValue ? typedValue : default;
        }
        return default;
    }

    public bool ContainsKey(string key)
    {
        return _parameters.ContainsKey(key);
    }
}

/// <summary>
///     다이얼로그 결과 구현
/// </summary>
public class DialogResult : IDialogResult
{
    public DialogResult()
    {
        Parameters = new DialogParameters();
    }

    public DialogResult(IDialogParameters parameters)
    {
        Parameters = parameters;
    }

    public IDialogParameters Parameters { get; }
}
