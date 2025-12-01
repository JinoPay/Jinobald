using System;
using System.Globalization;
using Avalonia.Controls;
using Avalonia.Data.Converters;

namespace Jinobald.Sample.Avalonia.Views.Dialogs;

public partial class MessageDialogView : UserControl
{
    public MessageDialogView()
    {
        InitializeComponent();
    }
}

/// <summary>
///     메시지 타입을 아이콘으로 변환하는 컨버터
/// </summary>
public class MessageTypeToIconConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is string messageType)
        {
            return messageType switch
            {
                "Info" => "ℹ️",
                "Success" => "✅",
                "Warning" => "⚠️",
                "Error" => "❌",
                _ => "ℹ️"
            };
        }
        return "ℹ️";
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
