using Jinobald.Subway.Core.Commands;
using Jinobald.Subway.Core.Options;
using Jinobald.Subway.Core.Realtime;
using Jinobald.Subway.Data;
using MediatR;
using Microsoft.Extensions.Options;

namespace Jinobald.Subway.Api;

/// <summary>
/// 시작 시 <c>Datasets:RawDir</c> 를 적재합니다. 체크섬이 같으면 건너뛰므로 매 시작마다 켜 두어도 됩니다.
/// </summary>
public sealed class StartupImportService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly DatasetOptions _options;
    private readonly ILogger<StartupImportService> _logger;

    public StartupImportService(IServiceProvider services, IOptions<DatasetOptions> options, ILogger<StartupImportService> logger)
    {
        _services = services ?? throw new ArgumentNullException(nameof(services));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.ImportOnStartup || string.IsNullOrWhiteSpace(_options.RawDir))
        {
            _logger.LogInformation("시작 시 데이터셋 적재를 건너뜁니다 (Datasets:ImportOnStartup={Flag}, RawDir={RawDir}).", _options.ImportOnStartup, _options.RawDir);
            return;
        }

        if (!Directory.Exists(_options.RawDir))
        {
            _logger.LogWarning("Datasets:RawDir 가 없습니다: {RawDir}", _options.RawDir);
            return;
        }

        try
        {
            await _services.GetRequiredService<MigrationRunner>().ApplyAsync(stoppingToken);
            using var scope = _services.CreateScope();
            var results = await scope.ServiceProvider.GetRequiredService<ISender>().Send(new ImportRawDirectoryCommand(_options.RawDir), stoppingToken);
            foreach (var r in results)
            {
                _logger.LogInformation("{Dataset}: {Status} {Rows}행", r.Dataset, r.Skipped ? "변경 없음" : "적재", r.RowCount);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "시작 시 데이터셋 적재에 실패했습니다.");
        }
    }
}

/// <summary>
/// 공공데이터포털 지하철알림정보를 1분마다 갱신합니다. 키가 없으면 조용히 쉽니다.
/// </summary>
public sealed class NoticeRefreshService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IDataGoKrClient _client;
    private readonly ILogger<NoticeRefreshService> _logger;

    public NoticeRefreshService(IServiceProvider services, IDataGoKrClient client, ILogger<NoticeRefreshService> logger)
    {
        _services = services ?? throw new ArgumentNullException(nameof(services));
        _client = client ?? throw new ArgumentNullException(nameof(client));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_client.IsConfigured)
        {
            _logger.LogInformation("DataGoKr:ServiceKey 가 없어 운행 공지 갱신을 하지 않습니다.");
            return;
        }

        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        do
        {
            try
            {
                using var scope = _services.CreateScope();
                var count = await scope.ServiceProvider.GetRequiredService<ISender>().Send(new RefreshNoticesCommand(), stoppingToken);
                _logger.LogDebug("운행 공지 {Count}건 갱신", count);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "운행 공지 갱신 실패");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
