using System.Windows;
using Jinobald.Core.Services.Regions;
using Jinobald.Wpf.Mvvm;

namespace Jinobald.Wpf.Services.Regions;

/// <summary>
///     WPF용 View Resolver
///     ViewModel 타입에서 View를 생성하고 DataContext를 바인딩합니다.
/// </summary>
public class WpfViewResolver : IViewResolver
{
    public Type? ResolveViewType(Type viewModelType)
    {
        return ViewModelLocator.ResolveViewType(viewModelType);
    }

    public object ResolveView(Type viewModelType, object viewModel)
    {
        var viewType = ResolveViewType(viewModelType);
        if (viewType == null)
            throw new InvalidOperationException($"Could not resolve view type for {viewModelType.FullName}");

        var view = (FrameworkElement)Activator.CreateInstance(viewType)!;
        view.DataContext = viewModel;

        return view;
    }
}
