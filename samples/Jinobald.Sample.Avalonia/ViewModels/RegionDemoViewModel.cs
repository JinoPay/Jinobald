using System.Linq;
using CommunityToolkit.Mvvm.Input;
using Jinobald.Core.Mvvm;
using Jinobald.Core.Services.Regions;
using Jinobald.Sample.Avalonia.ViewModels.Regions;

namespace Jinobald.Sample.Avalonia.ViewModels;

public partial class RegionDemoViewModel : ViewModelBase
{
    private readonly IRegionManager _regionManager;
    private string _lastAction = "Region에 뷰를 추가해보세요!";

    public string Title => "Region Demo!";

    public string LastAction
    {
        get => _lastAction;
        set => SetProperty(ref _lastAction, value);
    }

    public RegionDemoViewModel(IRegionManager regionManager)
    {
        _regionManager = regionManager;
    }

    [RelayCommand]
    private void AddRedView()
    {
        _regionManager.AddToRegion<RedItemViewModel>("ContentRegion");
        LastAction = "Red View가 ContentRegion에 추가되었습니다.";
    }

    [RelayCommand]
    private void AddBlueView()
    {
        _regionManager.AddToRegion<BlueItemViewModel>("ContentRegion");
        LastAction = "Blue View가 ContentRegion에 추가되었습니다.";
    }

    [RelayCommand]
    private void AddGreenView()
    {
        _regionManager.AddToRegion<GreenItemViewModel>("ContentRegion");
        LastAction = "Green View가 ContentRegion에 추가되었습니다.";
    }

    [RelayCommand]
    private void ClearRegion()
    {
        var region = _regionManager.GetRegion("ContentRegion");
        if (region != null)
        {
            var views = region.Views.ToList();
            foreach (var view in views)
            {
                region.Remove(view);
            }
            LastAction = "ContentRegion의 모든 뷰가 제거되었습니다.";
        }
    }
}
