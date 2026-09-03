using System.Reflection;
using Dapper;
using Microsoft.Extensions.Logging;

namespace Jinobald.Subway.Data;

/// <summary>
/// 임베디드 <c>Migrations/NNNN_*.sql</c> 을 번호 순으로 한 번씩 적용합니다. <c>schema_version</c> 에 기록해 멱등입니다.
/// </summary>
public sealed class MigrationRunner
{
    private readonly IDbConnectionFactory _factory;
    private readonly ILogger<MigrationRunner>? _logger;

    public MigrationRunner(IDbConnectionFactory factory, ILogger<MigrationRunner>? logger = null)
    {
        _factory = factory ?? throw new ArgumentNullException(nameof(factory));
        _logger = logger;
    }

    public async Task ApplyAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await _factory.OpenAsync(cancellationToken).ConfigureAwait(false);
        await connection.ExecuteAsync("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)").ConfigureAwait(false);
        var applied = (await connection.QueryAsync<int>("SELECT version FROM schema_version").ConfigureAwait(false)).ToHashSet();

        var assembly = Assembly.GetExecutingAssembly();
        var scripts = assembly.GetManifestResourceNames()
            .Where(n => n.EndsWith(".sql", StringComparison.OrdinalIgnoreCase))
            .Select(n => (Name: n, Version: ParseVersion(n)))
            .Where(s => s.Version > 0)
            .OrderBy(s => s.Version);

        foreach (var (name, version) in scripts)
        {
            if (applied.Contains(version))
            {
                continue;
            }

            await using var stream = assembly.GetManifestResourceStream(name)!;
            using var reader = new StreamReader(stream);
            var sql = await reader.ReadToEndAsync(cancellationToken).ConfigureAwait(false);
            await using var tx = await connection.BeginTransactionAsync(cancellationToken).ConfigureAwait(false);
            await connection.ExecuteAsync(sql, transaction: tx).ConfigureAwait(false);
            await connection.ExecuteAsync(
                "INSERT INTO schema_version (version, name, applied_at) VALUES (@version, @name, @appliedAt)",
                new { version, name, appliedAt = DateTimeOffset.UtcNow.ToString("O") },
                tx).ConfigureAwait(false);
            await tx.CommitAsync(cancellationToken).ConfigureAwait(false);
            _logger?.LogInformation("마이그레이션 {Version} 적용: {Name}", version, name);
        }
    }

    private static int ParseVersion(string resourceName)
    {
        // Jinobald.Subway.Data.Migrations.0001_init.sql → 1
        var file = resourceName.Split('.').Reverse().Skip(1).First();
        var digits = new string(file.TakeWhile(char.IsDigit).ToArray());
        return int.TryParse(digits, out var v) ? v : 0;
    }
}
