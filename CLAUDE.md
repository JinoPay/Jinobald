# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jinobald is a cross-platform MVVM framework supporting both WPF and Avalonia. It provides core MVVM features including DI, navigation, event aggregation, commands, and dialogs.

**Key Language:** C# with .NET 10.0 (LangVersion 14)

## Build and Test Commands

### Building

```bash
# Full solution build (Windows only - includes WPF)
dotnet build

# Core + Avalonia only (cross-platform: macOS/Linux)
dotnet build src/Jinobald.Core
dotnet build src/Jinobald.Avalonia

# Build specific project
dotnet build src/Jinobald.Core/Jinobald.Core.csproj
```

**Platform Constraints:**
- `Jinobald.Core` and `Jinobald.Avalonia`: Cross-platform (Windows, macOS, Linux)
- `Jinobald.Wpf`: Windows-only (targets `net10.0-windows`, requires WPF)

### Testing

```bash
# Run all tests
dotnet test

# Run tests with verbosity
dotnet test --verbosity normal
```

## Architecture

### Three-Layer Structure

1. **Jinobald.Core** - Platform-agnostic interfaces and contracts
   - `Mvvm/`: Lifecycle interfaces (`INavigationAware`, `IActivatable`, `IDestructible`, `IInitializableAsync`)
   - `Services/`: Service interfaces (`INavigationService`, `IEventAggregator`, `IDialogService`, `IThemeService`)
   - `ApplicationBase`: Abstract base class wrapping platform-specific Application classes
   - Base classes and interfaces for ViewModels, Dialogs, etc.

2. **Jinobald.Avalonia** - Avalonia-specific implementations
   - Complete implementation of all Core interfaces
   - `ViewModelLocator`: Convention-based View-ViewModel auto-wiring (Views.XView → ViewModels.XViewModel)
   - `NavigationService`: Full async navigation with history, guards, and lifecycle management
   - Avalonia Application wrapper inheriting from `ApplicationBase`

3. **Jinobald.Wpf** - WPF-specific implementations
   - Currently partial implementation (EventAggregator only)
   - Platform-specific WPF integrations
   - WPF Application wrapper inheriting from `ApplicationBase`

### Platform Abstraction via ApplicationBase

Both WPF and Avalonia `Application` classes are wrapped with `ApplicationBase` to provide a unified development experience across platforms. This abstraction ensures that application initialization, service registration, and lifecycle management work identically regardless of the UI framework.

**Key Principle:** Developers should be able to write application code once and target both WPF and Avalonia without platform-specific changes.

### Service Registration

**Avalonia:**
```csharp
// In Program.cs or App.axaml.cs
services.AddJinobaldAvalonia();
ViewModelLocator.SetServiceProvider(serviceProvider);
```

**WPF:**
```csharp
// In App.xaml.cs
services.AddJinobaldWpf();
```

### MVVM Lifecycle Flow

Navigation triggers a precise lifecycle sequence managed by `NavigationService`:

1. **Navigation Guard Phase**
   - `INavigationAware.OnNavigatingFromAsync()` on current VM (can cancel)
   - `INavigationAware.OnNavigatingToAsync()` on target VM (can cancel)

2. **Deactivation Phase**
   - `IActivatable.DeactivateAsync()` on current VM
   - `INavigationAware.OnNavigatedFromAsync()` on current VM

3. **View Creation Phase**
   - View instantiated and DataContext bound on UI thread
   - CurrentView/CurrentViewModel updated
   - View displayed to user

4. **Activation Phase** (outside navigation lock to prevent deadlocks)
   - `IInitializableAsync.InitializeAsync()` on new VM
   - `INavigationAware.OnNavigatedToAsync()` on new VM
   - `IActivatable.ActivateAsync()` on new VM

### Navigation Service Details

- **DI Integration:** Both Views and ViewModels are resolved from DI container with full dependency injection
- **Auto-Wiring:** ViewModels are automatically connected to Views via convention-based resolution
- **Concurrency:** Uses `SemaphoreSlim` to prevent simultaneous navigation operations
- **History Management:** Maintains back/forward stacks with `NavigationEntry` records
- **View Resolution:** Leverages `ViewModelLocator.ResolveViewType()` for convention-based View discovery
- **Thread Safety:** View creation forced onto UI thread via `Dispatcher.UIThread.InvokeAsync()`
- **Lock Strategy:** Lifecycle hooks executed outside lock to prevent deadlocks during async initialization

### EventAggregator Threading

**Important:** Use `IEventAggregator` for pub/sub messaging, NOT CommunityToolkit.Mvvm's Messenger.

The `IEventAggregator` supports three threading models via `ThreadOption` enum:

- `PublisherThread`: Execute handler on publishing thread (synchronous)
- `UIThread`: Marshal to UI thread via Dispatcher
- `BackgroundThread`: Execute on ThreadPool

Both sync (`Action<TEvent>`) and async (`Func<TEvent, Task>`) handlers supported.

### ViewModelLocator Convention

**Pattern:** `Namespace.Views.XView` → `Namespace.ViewModels.XViewModel`

- Also handles Window suffix: `ShellWindow` → `ShellViewModel`
- Assembly-scoped resolution via reflection
- Requires DI container setup via `SetServiceProvider()`
- Attached property: `ViewModelLocator.AutoWireViewModel="True"` in XAML

### Dialog Service

**Important:** Dialogs are displayed as in-window overlays, NOT separate windows.

Both WPF and Avalonia implementations should show dialogs within the main window content area, not as popup windows. This provides a modern, consistent UX across platforms.

### Theme Service

`IThemeService` provides general-purpose theme style management beyond just Light/Dark modes.

**Critical Rule:** Never hardcode theme colors directly in Views or ViewModels. Always:
- Inject theme styles from `IThemeService`
- Use theme-aware resource references
- Retrieve colors/styles through the theme service API

Hardcoding colors can lead to theming conflicts and maintenance issues. The theme service ensures consistent styling across the application and prevents color management bugs during development.

## Core Dependencies

- **MVVM Framework:** CommunityToolkit.Mvvm - Used for base classes, commands, and MVVM infrastructure
- **Logging:** Serilog - Used for all logging throughout the framework
- **DI Container:** Microsoft.Extensions.DependencyInjection (wrapped for better usability)
- **Avalonia:** 11.2.2 (for Avalonia implementation)

### DI Container Abstraction

The framework wraps Microsoft.Extensions.DependencyInjection with a Prism-style API for improved usability:

- **`IContainerExtension`** - Abstraction interface for DI container operations
- **`ContainerLocator.Current`** - Static accessor for container instance
  - `ContainerLocator.Current.Resolve<T>()` - Service resolution
  - `ContainerLocator.Current.Resolve<T>(params)` - Service resolution with parameters
- **Registration Methods:**
  - `RegisterSingleton<TInterface, TImplementation>()`
  - `RegisterSingleton<T>()`
  - `RegisterTransient<TInterface, TImplementation>()`
  - And other registration helpers following Prism conventions

## Development Notes

- **Target Framework:** All projects use .NET 10.0 (Jinobald.Wpf uses `net10.0-windows`)
- **C# Language Version:** 14 with nullable reference types enabled

### Code Conventions

- **모든 주석, 문서화, 설명은 한글로 작성** - All comments, documentation, and descriptions must be in Korean
- Navigation methods return `Task<bool>` to indicate success/failure
- Legacy sync methods marked `[Obsolete]` with guidance to use async versions
- **All ViewModels must inherit from ViewModel base class** and implement required lifecycle interfaces
- **All Dialogs must implement dialog interfaces** defined in Jinobald.Core
- Follow interface contracts strictly - interfaces define the framework's extension points
