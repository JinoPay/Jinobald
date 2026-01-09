using JinoLib.Printer.Abstractions;
using JinoLib.Printer.Builders;
using JinoLib.Printer.Connectors;
using JinoLib.Printer.Connectors.Options;
using JinoLib.Printer.Printer;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace JinoLib.Printer.Extensions;

/// <summary>
/// DI 컨테이너 확장 메서드
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// JinoLib.Printer 기본 서비스 등록
    /// </summary>
    public static IServiceCollection AddJinoLibPrinter(this IServiceCollection services)
    {
        services.TryAddSingleton<IPrinterFactory, PrinterFactory>();
        services.TryAddTransient<IReceiptBuilder, ReceiptBuilder>();

        return services;
    }

    #region 네트워크 프린터

    /// <summary>
    /// 네트워크 프린터 등록
    /// </summary>
    public static IServiceCollection AddNetworkPrinter(
        this IServiceCollection services,
        string ipAddress,
        int port = 9100)
    {
        return services.AddNetworkPrinter(new NetworkConnectorOptions
        {
            IpAddress = ipAddress,
            Port = port
        });
    }

    /// <summary>
    /// 네트워크 프린터 등록 (옵션 사용)
    /// </summary>
    public static IServiceCollection AddNetworkPrinter(
        this IServiceCollection services,
        NetworkConnectorOptions options)
    {
        services.AddJinoLibPrinter();
        services.AddSingleton(options);
        services.AddSingleton<IPrinterConnector, NetworkConnector>();
        services.AddSingleton<IPrinter, EscPosPrinter>();

        return services;
    }

#if NET8_0_OR_GREATER
    /// <summary>
    /// 네트워크 프린터 등록 (Keyed Services - .NET 8+)
    /// </summary>
    public static IServiceCollection AddKeyedNetworkPrinter(
        this IServiceCollection services,
        string key,
        string ipAddress,
        int port = 9100)
    {
        return services.AddKeyedNetworkPrinter(key, new NetworkConnectorOptions
        {
            IpAddress = ipAddress,
            Port = port
        });
    }

    /// <summary>
    /// 네트워크 프린터 등록 (Keyed Services - .NET 8+, 옵션 사용)
    /// </summary>
    public static IServiceCollection AddKeyedNetworkPrinter(
        this IServiceCollection services,
        string key,
        NetworkConnectorOptions options)
    {
        services.AddJinoLibPrinter();
        services.AddKeyedSingleton(key, options);
        services.AddKeyedSingleton<IPrinterConnector, NetworkConnector>(key,
            (sp, _) => new NetworkConnector(options, sp.GetService<Microsoft.Extensions.Logging.ILogger<NetworkConnector>>()));
        services.AddKeyedSingleton<IPrinter>(key,
            (sp, k) => new EscPosPrinter(
                sp.GetRequiredKeyedService<IPrinterConnector>(k),
                sp.GetService<Microsoft.Extensions.Logging.ILogger<EscPosPrinter>>()));

        return services;
    }
#endif

    #endregion

    #region 시리얼 프린터

    /// <summary>
    /// 시리얼 프린터 등록
    /// </summary>
    public static IServiceCollection AddSerialPrinter(
        this IServiceCollection services,
        string portName,
        int baudRate = 9600)
    {
        return services.AddSerialPrinter(new SerialConnectorOptions
        {
            PortName = portName,
            BaudRate = baudRate
        });
    }

    /// <summary>
    /// 시리얼 프린터 등록 (옵션 사용)
    /// </summary>
    public static IServiceCollection AddSerialPrinter(
        this IServiceCollection services,
        SerialConnectorOptions options)
    {
        services.AddJinoLibPrinter();
        services.AddSingleton(options);
        services.AddSingleton<IPrinterConnector, SerialConnector>();
        services.AddSingleton<IPrinter, EscPosPrinter>();

        return services;
    }

#if NET8_0_OR_GREATER
    /// <summary>
    /// 시리얼 프린터 등록 (Keyed Services)
    /// </summary>
    public static IServiceCollection AddKeyedSerialPrinter(
        this IServiceCollection services,
        string key,
        SerialConnectorOptions options)
    {
        services.AddJinoLibPrinter();
        services.AddKeyedSingleton(key, options);
        services.AddKeyedSingleton<IPrinterConnector, SerialConnector>(key,
            (sp, _) => new SerialConnector(options, sp.GetService<Microsoft.Extensions.Logging.ILogger<SerialConnector>>()));
        services.AddKeyedSingleton<IPrinter>(key,
            (sp, k) => new EscPosPrinter(
                sp.GetRequiredKeyedService<IPrinterConnector>(k),
                sp.GetService<Microsoft.Extensions.Logging.ILogger<EscPosPrinter>>()));

        return services;
    }
#endif

    #endregion

#if WINDOWS_BUILD
    #region 스풀러 프린터

    /// <summary>
    /// 스풀러 프린터 등록 (드라이버 설치 필요, Windows 전용)
    /// </summary>
    public static IServiceCollection AddSpoolerPrinter(
        this IServiceCollection services,
        string printerName)
    {
        return services.AddSpoolerPrinter(new SpoolerConnectorOptions
        {
            PrinterName = printerName
        });
    }

    /// <summary>
    /// 스풀러 프린터 등록 (옵션 사용, Windows 전용)
    /// </summary>
    public static IServiceCollection AddSpoolerPrinter(
        this IServiceCollection services,
        SpoolerConnectorOptions options)
    {
        services.AddJinoLibPrinter();
        services.AddSingleton(options);
        services.AddSingleton<IPrinterConnector, SpoolerConnector>();
        services.AddSingleton<IPrinter, EscPosPrinter>();

        return services;
    }

#if NET8_0_OR_GREATER
    /// <summary>
    /// 스풀러 프린터 등록 (Keyed Services, Windows 전용)
    /// </summary>
    public static IServiceCollection AddKeyedSpoolerPrinter(
        this IServiceCollection services,
        string key,
        SpoolerConnectorOptions options)
    {
        services.AddJinoLibPrinter();
        services.AddKeyedSingleton(key, options);
        services.AddKeyedSingleton<IPrinterConnector, SpoolerConnector>(key,
            (sp, _) => new SpoolerConnector(options, sp.GetService<Microsoft.Extensions.Logging.ILogger<SpoolerConnector>>()));
        services.AddKeyedSingleton<IPrinter>(key,
            (sp, k) => new EscPosPrinter(
                sp.GetRequiredKeyedService<IPrinterConnector>(k),
                sp.GetService<Microsoft.Extensions.Logging.ILogger<EscPosPrinter>>()));

        return services;
    }
#endif

    #endregion

    #region USB 직접 연결 프린터

    /// <summary>
    /// USB 직접 연결 프린터 등록 (드라이버 없이, Windows 전용)
    /// </summary>
    public static IServiceCollection AddUsbDirectPrinter(
        this IServiceCollection services,
        ushort vendorId,
        ushort productId)
    {
        return services.AddUsbDirectPrinter(new UsbDirectConnectorOptions
        {
            VendorId = vendorId,
            ProductId = productId
        });
    }

    /// <summary>
    /// USB 직접 연결 프린터 등록 (디바이스 경로, Windows 전용)
    /// </summary>
    public static IServiceCollection AddUsbDirectPrinter(
        this IServiceCollection services,
        string devicePath)
    {
        return services.AddUsbDirectPrinter(new UsbDirectConnectorOptions
        {
            DevicePath = devicePath
        });
    }

    /// <summary>
    /// USB 직접 연결 프린터 등록 (옵션 사용, Windows 전용)
    /// </summary>
    public static IServiceCollection AddUsbDirectPrinter(
        this IServiceCollection services,
        UsbDirectConnectorOptions options)
    {
        services.AddJinoLibPrinter();
        services.AddSingleton(options);
        services.AddSingleton<IPrinterConnector, UsbDirectConnector>();
        services.AddSingleton<IPrinter, EscPosPrinter>();

        return services;
    }

#if NET8_0_OR_GREATER
    /// <summary>
    /// USB 직접 연결 프린터 등록 (Keyed Services, Windows 전용)
    /// </summary>
    public static IServiceCollection AddKeyedUsbDirectPrinter(
        this IServiceCollection services,
        string key,
        UsbDirectConnectorOptions options)
    {
        services.AddJinoLibPrinter();
        services.AddKeyedSingleton(key, options);
        services.AddKeyedSingleton<IPrinterConnector, UsbDirectConnector>(key,
            (sp, _) => new UsbDirectConnector(options, sp.GetService<Microsoft.Extensions.Logging.ILogger<UsbDirectConnector>>()));
        services.AddKeyedSingleton<IPrinter>(key,
            (sp, k) => new EscPosPrinter(
                sp.GetRequiredKeyedService<IPrinterConnector>(k),
                sp.GetService<Microsoft.Extensions.Logging.ILogger<EscPosPrinter>>()));

        return services;
    }
#endif

    #endregion
#endif

    #region 블루투스 프린터

    /// <summary>
    /// 블루투스 프린터 등록
    /// </summary>
    public static IServiceCollection AddBluetoothPrinter(
        this IServiceCollection services,
        string portName)
    {
        return services.AddBluetoothPrinter(new BluetoothConnectorOptions
        {
            PortName = portName
        });
    }

    /// <summary>
    /// 블루투스 프린터 등록 (옵션 사용)
    /// </summary>
    public static IServiceCollection AddBluetoothPrinter(
        this IServiceCollection services,
        BluetoothConnectorOptions options)
    {
        services.AddJinoLibPrinter();
        services.AddSingleton(options);
        services.AddSingleton<IPrinterConnector, BluetoothConnector>();
        services.AddSingleton<IPrinter, EscPosPrinter>();

        return services;
    }

#if NET8_0_OR_GREATER
    /// <summary>
    /// 블루투스 프린터 등록 (Keyed Services)
    /// </summary>
    public static IServiceCollection AddKeyedBluetoothPrinter(
        this IServiceCollection services,
        string key,
        BluetoothConnectorOptions options)
    {
        services.AddJinoLibPrinter();
        services.AddKeyedSingleton(key, options);
        services.AddKeyedSingleton<IPrinterConnector, BluetoothConnector>(key,
            (sp, _) => new BluetoothConnector(options, sp.GetService<Microsoft.Extensions.Logging.ILogger<BluetoothConnector>>()));
        services.AddKeyedSingleton<IPrinter>(key,
            (sp, k) => new EscPosPrinter(
                sp.GetRequiredKeyedService<IPrinterConnector>(k),
                sp.GetService<Microsoft.Extensions.Logging.ILogger<EscPosPrinter>>()));

        return services;
    }
#endif

    #endregion
}
