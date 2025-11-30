using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;

namespace Jinobald.Sample.Avalonia;

public partial class App : global::Avalonia.Application
{
    private SampleApp? _sampleApp;

    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override async void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            // Jinobald 프레임워크 초기화
            _sampleApp = new SampleApp();
            await _sampleApp.RunAsync();
        }

        base.OnFrameworkInitializationCompleted();
    }
}
