using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Options;

namespace Jinobald.Subway.Data;

/// <summary>
/// 열린 SQLite 연결을 만듭니다. WAL 모드라 읽기(API)와 쓰기(적재)가 서로 막지 않습니다.
/// </summary>
public interface IDbConnectionFactory
{
    Task<SqliteConnection> OpenAsync(CancellationToken cancellationToken = default);

    string DatabasePath { get; }
}

/// <summary>
/// 기본 구현.
/// </summary>
public sealed class SqliteConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;

    public SqliteConnectionFactory(IOptions<DatabaseOptions> options)
    {
        ArgumentNullException.ThrowIfNull(options);
        DatabasePath = Path.GetFullPath(options.Value.Path);
        var directory = Path.GetDirectoryName(DatabasePath);
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }

        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = DatabasePath,
            Mode = SqliteOpenMode.ReadWriteCreate,
            Cache = SqliteCacheMode.Shared,
            Pooling = true,
        }.ToString();
    }

    public string DatabasePath { get; }

    public async Task<SqliteConnection> OpenAsync(CancellationToken cancellationToken = default)
    {
        var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken).ConfigureAwait(false);
        await using (var pragma = connection.CreateCommand())
        {
            pragma.CommandText = "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;";
            await pragma.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }

        return connection;
    }
}
