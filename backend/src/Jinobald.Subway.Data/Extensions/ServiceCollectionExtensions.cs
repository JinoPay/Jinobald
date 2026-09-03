using Jinobald.Subway.Core.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Jinobald.Subway.Data.Extensions;

/// <summary>
/// SQLite + Dapper 리포지토리 등록.
/// </summary>
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddSubwayData(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.Configure<DatabaseOptions>(configuration.GetSection(DatabaseOptions.SectionName));
        services.TryAddSingleton<IDbConnectionFactory, SqliteConnectionFactory>();
        services.TryAddSingleton<MigrationRunner>();
        services.TryAddSingleton<ISubwayReadRepository, DapperSubwayReadRepository>();
        services.TryAddSingleton<ISubwayWriteRepository, DapperSubwayWriteRepository>();
        return services;
    }
}
