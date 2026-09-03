using Jinobald.Subway.Core.Cqrs;
using Jinobald.Subway.Core.Domain;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Jinobald.Subway.Core.Commands;

/// <summary>
/// <c>scripts/data/raw</c> 디렉터리의 알려진 파일들을 모두 적재합니다. 없는 파일은 건너뜁니다.
/// </summary>
public sealed record ImportRawDirectoryCommand(string RawDir) : ICommand<IReadOnlyList<ImportResult>>, IValidatable
{
    public IEnumerable<string> Validate()
    {
        if (string.IsNullOrWhiteSpace(RawDir))
        {
            yield return "RawDir 가 비어 있습니다.";
        }
        else if (!Directory.Exists(RawDir))
        {
            yield return $"디렉터리가 없습니다: {RawDir}";
        }
    }
}

/// <summary>
/// 파일명 → 데이터셋 매핑은 scripts/data/raw/README.md 와 같습니다.
/// </summary>
public sealed class ImportRawDirectoryCommandHandler : ICommandHandler<ImportRawDirectoryCommand, IReadOnlyList<ImportResult>>
{
    /// <summary>
    /// (파일명, 데이터셋). 역코드는 raw 의 상위 디렉터리에 있습니다.
    /// </summary>
    public static readonly (string File, DatasetKind Kind)[] KnownFiles =
    [
        ("../station_code.raw.csv", DatasetKind.StationCodes),
        ("transfer-guides.csv", DatasetKind.TransferGuides),
        ("transfer-walk-times.csv", DatasetKind.TransferWalkTimes),
        ("segment-times.csv", DatasetKind.SegmentTimes),
        ("timetable.csv.gz", DatasetKind.Timetable),
    ];

    private readonly ISender _sender;
    private readonly ILogger<ImportRawDirectoryCommandHandler>? _logger;

    public ImportRawDirectoryCommandHandler(ISender sender, ILogger<ImportRawDirectoryCommandHandler>? logger = null)
    {
        _sender = sender ?? throw new ArgumentNullException(nameof(sender));
        _logger = logger;
    }

    public async Task<IReadOnlyList<ImportResult>> Handle(ImportRawDirectoryCommand request, CancellationToken cancellationToken)
    {
        var results = new List<ImportResult>();
        foreach (var (file, kind) in KnownFiles)
        {
            var path = Path.GetFullPath(Path.Combine(request.RawDir, file));
            if (!File.Exists(path))
            {
                _logger?.LogWarning("{Dataset}: {Path} 가 없어 건너뜁니다.", kind, path);
                continue;
            }

            await using var stream = await OpenAsync(path, cancellationToken).ConfigureAwait(false);
            results.Add(await _sender.Send(new ImportDatasetCommand(kind, stream, Path.GetFileName(path)), cancellationToken).ConfigureAwait(false));
        }

        return results;
    }

    /// <summary>
    /// gzip 이면 메모리로 풀어 seek 가능한 스트림으로 만듭니다 (체크섬과 파싱이 두 번 읽음).
    /// </summary>
    private static async Task<Stream> OpenAsync(string path, CancellationToken cancellationToken)
    {
        if (!path.EndsWith(".gz", StringComparison.OrdinalIgnoreCase))
        {
            return new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 1 << 16, useAsync: true);
        }

        await using var file = File.OpenRead(path);
        await using var gunzip = new System.IO.Compression.GZipStream(file, System.IO.Compression.CompressionMode.Decompress);
        var buffer = new MemoryStream();
        await gunzip.CopyToAsync(buffer, cancellationToken).ConfigureAwait(false);
        buffer.Position = 0;
        return buffer;
    }
}
