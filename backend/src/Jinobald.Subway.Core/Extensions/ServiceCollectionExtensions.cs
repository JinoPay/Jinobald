using Jinobald.Subway.Core.Cqrs;
using Jinobald.Subway.Core.Options;
using Jinobald.Subway.Core.Realtime;
using Jinobald.Subway.Core.Time;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace Jinobald.Subway.Core.Extensions;

/// <summary>
/// Core 등록. 리포지토리 구현은 Data 프로젝트의 <c>AddSubwayData</c> 가 따로 등록합니다.
/// </summary>
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddSubwayCore(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        #region 옵션

        services.Configure<SeoulOpenApiOptions>(configuration.GetSection(SeoulOpenApiOptions.SectionName));
        services.Configure<DataGoKrOptions>(configuration.GetSection(DataGoKrOptions.SectionName));
        services.Configure<RealtimeOptions>(configuration.GetSection(RealtimeOptions.SectionName));
        services.Configure<DatasetOptions>(configuration.GetSection(DatasetOptions.SectionName));
        services.Configure<TimetableOptions>(configuration.GetSection(TimetableOptions.SectionName));

        #endregion

        #region CQRS

        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssemblyContaining<CoreMarker>();
            cfg.AddOpenBehavior(typeof(LoggingBehavior<,>));
            cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
        });

        #endregion

        #region 시간·시각표

        services.TryAddSingleton<IClock, SystemClock>();
        services.TryAddSingleton(sp =>
        {
            var configured = sp.GetRequiredService<IOptions<TimetableOptions>>().Value.Holidays;
            var holidays = configured.Count > 0
                ? configured.Select(h => DateOnly.Parse(h, System.Globalization.CultureInfo.InvariantCulture))
                : DayTypeResolver.DefaultHolidays2026;
            return new DayTypeResolver(holidays);
        });

        #endregion

        #region 실시간

        services.AddMemoryCache();
        services.TryAddSingleton<QuotaGuard>();
        services.TryAddSingleton<RealtimeCache>();
        services.AddHttpClient<ISeoulOpenApiClient, SeoulOpenApiClient>();
        services.AddHttpClient<IDataGoKrClient, DataGoKrClient>();
        services.TryAddSingleton<TimetableSimulatorProvider>();
        services.TryAddSingleton<IRealtimeProvider>(sp =>
        {
            var seoul = sp.GetRequiredService<IOptions<SeoulOpenApiOptions>>().Value;
            if (!seoul.IsConfigured)
            {
                return sp.GetRequiredService<TimetableSimulatorProvider>();
            }

            return new SeoulRealtimeProvider(
                sp.GetRequiredService<ISeoulOpenApiClient>(),
                sp.GetRequiredService<RealtimeCache>(),
                sp.GetRequiredService<QuotaGuard>(),
                sp.GetRequiredService<TimetableSimulatorProvider>());
        });

        #endregion

        return services;
    }
}
