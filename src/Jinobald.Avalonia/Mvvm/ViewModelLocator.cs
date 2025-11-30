using Avalonia;
using Avalonia.Controls;

namespace Jinobald.Avalonia.Mvvm;

/// <summary>
///     View와 ViewModel을 컨벤션 기반으로 자동 연결하는 ViewModelLocator
///     Views.SplashView → ViewModels.SplashViewModel 패턴으로 자동 매칭
/// </summary>
public static class ViewModelLocator
{
    /// <summary>
    ///     AutoWireViewModel Attached Property
    /// </summary>
    public static readonly AttachedProperty<bool> AutoWireViewModelProperty =
        AvaloniaProperty.RegisterAttached<Control, bool>(
            "AutoWireViewModel",
            typeof(ViewModelLocator),
            false);

    private static IServiceProvider? _serviceProvider;

    static ViewModelLocator()
    {
        AutoWireViewModelProperty.Changed.AddClassHandler<Control>(OnAutoWireViewModelChanged);
    }

    public static bool GetAutoWireViewModel(Control element)
    {
        return element.GetValue(AutoWireViewModelProperty);
    }

    /// <summary>
    ///     View 타입에서 ViewModel 타입을 추론
    /// </summary>
    public static Type? ResolveViewModelType(Type viewType)
    {
        var viewName = viewType.FullName;
        if (string.IsNullOrEmpty(viewName))
            return null;

        // Views → ViewModels, View → ViewModel
        var viewModelName = viewName
            .Replace(".Views.", ".ViewModels.")
            .Replace("View", "ViewModel");

        // Window 접미사 처리 (ShellWindow → ShellViewModel)
        if (viewModelName.EndsWith("WindowModel")) viewModelName = viewModelName.Replace("WindowModel", "ViewModel");

        return viewType.Assembly.GetType(viewModelName);
    }

    /// <summary>
    ///     ViewModel 타입에서 View 타입을 추론
    /// </summary>
    public static Type? ResolveViewType(Type viewModelType)
    {
        var viewModelName = viewModelType.FullName;
        if (string.IsNullOrEmpty(viewModelName))
            return null;

        // ViewModels → Views, ViewModel → View
        var viewName = viewModelName
            .Replace(".ViewModels.", ".Views.")
            .Replace("ViewModel", "View");

        return viewModelType.Assembly.GetType(viewName);
    }

    public static void SetAutoWireViewModel(Control element, bool value)
    {
        element.SetValue(AutoWireViewModelProperty, value);
    }

    /// <summary>
    ///     DI 컨테이너 설정 (앱 시작시 호출)
    /// </summary>
    public static void SetServiceProvider(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    /// <summary>
    ///     View 타입에서 ViewModel을 찾아 DI 컨테이너에서 resolve
    /// </summary>
    private static object? ResolveViewModel(Type viewType)
    {
        if (_serviceProvider == null)
            return null;

        var viewModelType = ResolveViewModelType(viewType);
        if (viewModelType == null)
            return null;

        return _serviceProvider.GetService(viewModelType);
    }

    private static void OnAutoWireViewModelChanged(Control control, AvaloniaPropertyChangedEventArgs e)
    {
        if (e.NewValue is true)
        {
            var viewModel = ResolveViewModel(control.GetType());
            if (viewModel != null) control.DataContext = viewModel;
        }
    }
}
