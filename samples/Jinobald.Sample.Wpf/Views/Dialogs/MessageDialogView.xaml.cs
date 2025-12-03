using System;
using System.Globalization;
using System.Windows.Controls;
using System.Windows.Data;

namespace Jinobald.Sample.Wpf.Views.Dialogs;

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
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is string messageType)
        {
            return messageType switch
            {
                "Info" => "i",
                "Success" => "O",
                "Warning" => "!",
                "Error" => "X",
                _ => "?"
            };
        }
        return "?";
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
