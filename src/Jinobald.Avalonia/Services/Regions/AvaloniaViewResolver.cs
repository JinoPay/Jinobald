using Avalonia.Controls;
using Jinobald.Avalonia.Mvvm;
using Jinobald.Core.Ioc;
using Jinobald.Core.Services.Regions;

namespace Jinobald.Avalonia.Services.Regions;

/// <summary>
///     Avalonia용 View Resolver
///     Prism의 컨벤션 기반 View/ViewModel 해석을 따름
///     - View → ViewModel: Views.XView → ViewModels.XViewModel
///     - ViewModel → View: ViewModels.XViewModel → Views.XView
/// </summary>
public class AvaloniaViewResolver : IViewResolver
{
    #region View → ViewModel

    public Type? ResolveViewModelType(Type viewType)
    {
        return ViewModelLocator.ResolveViewModelType(viewType);
    }

    public object ResolveView(Type viewType)
    {
        // 1. View 인스턴스 생성 (DI에서)
        var view = ContainerLocator.Current.Resolve(viewType);
        if (view is not Control control)
            throw new InvalidOperationException($"{viewType.FullName} is not a valid Avalonia Control");

        // 2. ViewModel 타입 추론
        var viewModelType = ResolveViewModelType(viewType);
        if (viewModelType != null)
        {
            // 3. ViewModel 생성 (DI에서)
            var viewModel = ContainerLocator.Current.Resolve(viewModelType);

            // 4. DataContext 바인딩
            control.DataContext = viewModel;
        }

        return control;
    }

    #endregion

    #region ViewModel → View

    public Type? ResolveViewType(Type viewModelType)
    {
        return ViewModelLocator.ResolveViewType(viewModelType);
    }

    public object ResolveView(Type viewModelType, object viewModel)
    {
        // 1. View 타입 추론
        var viewType = ResolveViewType(viewModelType);
        if (viewType == null)
            throw new InvalidOperationException($"Could not resolve view type for {viewModelType.FullName}");

        // 2. View 인스턴스 생성 (DI에서)
        var view = ContainerLocator.Current.Resolve(viewType);
        if (view is not Control control)
            throw new InvalidOperationException($"{viewType.FullName} is not a valid Avalonia Control");

        // 3. DataContext 바인딩
        control.DataContext = viewModel;

        return control;
    }

    #endregion
}
