using Jinobald.Subway.Core.Cqrs;
using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Ingestion;
using Jinobald.Subway.Core.Repositories;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Jinobald.Subway.Core.Commands;

/// <summary>
/// CSV 한 종류를 적재합니다. 체크섬이 이미 기록돼 있으면 건너뜁니다.
/// </summary>
public sealed record ImportDatasetCommand(DatasetKind Kind, Stream Csv, string SourceName) : ICommand<ImportResult>;

/// <summary>
/// 적재 완료 알림. 시뮬레이터 캐시 등을 무효화하는 데 씁니다.
/// </summary>
public sealed record DatasetImportedNotification(ImportResult Result) : INotification;

/// <summary>
/// 파서 → 리포지토리 교체 → 이력 기록. 43만 행 시각표도 스트림을 두 번(체크섬, 파싱) 읽으므로 seek 가능한 스트림이어야 합니다.
/// </summary>
public sealed class ImportDatasetCommandHandler : ICommandHandler<ImportDatasetCommand, ImportResult>
{
    private readonly ISubwayReadRepository _read;
    private readonly ISubwayWriteRepository _write;
    private readonly IPublisher _publisher;
    private readonly ILogger<ImportDatasetCommandHandler>? _logger;

    public ImportDatasetCommandHandler(ISubwayReadRepository read, ISubwayWriteRepository write, IPublisher publisher, ILogger<ImportDatasetCommandHandler>? logger = null)
    {
        _read = read ?? throw new ArgumentNullException(nameof(read));
        _write = write ?? throw new ArgumentNullException(nameof(write));
        _publisher = publisher ?? throw new ArgumentNullException(nameof(publisher));
        _logger = logger;
    }

    public async Task<ImportResult> Handle(ImportDatasetCommand request, CancellationToken cancellationToken)
    {
        Stream csv = request.Csv;
        if (!csv.CanSeek)
        {
            var buffered = new MemoryStream();
            await csv.CopyToAsync(buffered, cancellationToken).ConfigureAwait(false);
            buffered.Position = 0;
            csv = buffered;
        }

        csv.Position = 0;
        var checksum = await Checksum.Sha256Async(csv, cancellationToken).ConfigureAwait(false);
        csv.Position = 0;

        if (await _read.HasImportRunAsync(request.Kind, checksum, cancellationToken).ConfigureAwait(false))
        {
            _logger?.LogInformation("{Dataset}: 같은 내용({Checksum})이 이미 적재되어 있어 건너뜁니다.", request.Kind, checksum[..12]);
            return ImportResult.SkippedUnchanged(request.Kind, request.SourceName, checksum, 0);
        }

        int rowCount;
        IReadOnlyList<string> warnings;
        switch (request.Kind)
        {
            case DatasetKind.StationCodes:
            {
                var outcome = await new StationCodeParser().ParseAsync(csv, cancellationToken).ConfigureAwait(false);
                await _write.ReplaceStationCodesAsync(outcome.Rows, cancellationToken).ConfigureAwait(false);
                (rowCount, warnings) = (outcome.Rows.Count, outcome.Warnings);
                break;
            }

            case DatasetKind.TransferGuides:
            {
                var outcome = await new TransferGuideParser().ParseAsync(csv, cancellationToken).ConfigureAwait(false);
                await _write.ReplaceTransferGuidesAsync(outcome.Rows, cancellationToken).ConfigureAwait(false);
                (rowCount, warnings) = (outcome.Rows.Count, outcome.Warnings);
                break;
            }

            case DatasetKind.TransferWalkTimes:
            {
                var outcome = await new TransferWalkTimeParser().ParseAsync(csv, cancellationToken).ConfigureAwait(false);
                await _write.ReplaceTransferWalkTimesAsync(outcome.Rows, cancellationToken).ConfigureAwait(false);
                (rowCount, warnings) = (outcome.Rows.Count, outcome.Warnings);
                break;
            }

            case DatasetKind.SegmentTimes:
            {
                var outcome = await new SegmentTimeParser().ParseAsync(csv, cancellationToken).ConfigureAwait(false);
                await _write.ReplaceSegmentTimesAsync(outcome.Rows, cancellationToken).ConfigureAwait(false);
                (rowCount, warnings) = (outcome.Rows.Count, outcome.Warnings);
                break;
            }

            case DatasetKind.Timetable:
            {
                var outcome = await new TimetableParser().ParseAsync(csv, cancellationToken).ConfigureAwait(false);
                await _write.ReplaceTimetableAsync(outcome.Rows, cancellationToken).ConfigureAwait(false);
                (rowCount, warnings) = (outcome.Rows.Count, outcome.Warnings);
                break;
            }

            default:
                throw new ArgumentOutOfRangeException(nameof(request), request.Kind, "알 수 없는 데이터셋입니다.");
        }

        await _write.RecordImportRunAsync(new ImportRun(request.Kind, request.SourceName, checksum, rowCount, DateTimeOffset.UtcNow), cancellationToken).ConfigureAwait(false);
        var result = new ImportResult(request.Kind, request.SourceName, checksum, rowCount, false, warnings);
        _logger?.LogInformation("{Dataset}: {Rows}행 적재 (경고 {Warnings}건).", request.Kind, rowCount, warnings.Count);
        await _publisher.Publish(new DatasetImportedNotification(result), cancellationToken).ConfigureAwait(false);
        return result;
    }
}
