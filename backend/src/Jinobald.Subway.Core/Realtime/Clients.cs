using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Jinobald.Subway.Core.Realtime;

/// <summary>
/// 서울 열린데이터광장 실시간 API 클라이언트.
/// </summary>
public interface ISeoulOpenApiClient
{
    Task<IReadOnlyList<RawArrivalRow>> GetArrivalsAsync(string stationName, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RawPositionRow>> GetPositionsAsync(string lineName, CancellationToken cancellationToken = default);
}

/// <summary>
/// 서울 API 오류 분류. 앱의 SeoulOpenApiClient.ts 와 같은 기준입니다.
/// </summary>
public enum SeoulApiErrorKind
{
    Network,
    Timeout,
    Auth,
    Quota,
    Unknown,
}

/// <summary>
/// 서울 API 호출 실패.
/// </summary>
public sealed class SeoulApiException : Exception
{
    public SeoulApiException(SeoulApiErrorKind kind, string? code, string message)
        : base(message)
    {
        Kind = kind;
        Code = code;
    }

    public SeoulApiErrorKind Kind { get; }

    public string? Code { get; }

    public static SeoulApiErrorKind Classify(string? code) => code switch
    {
        null => SeoulApiErrorKind.Unknown,
        "ERROR-337" => SeoulApiErrorKind.Quota,
        _ when code.StartsWith("INFO-1", StringComparison.Ordinal) => SeoulApiErrorKind.Auth,
        _ => SeoulApiErrorKind.Unknown,
    };
}

/// <summary>
/// HttpClient 기반 구현. 인증키는 URL 경로에 들어갑니다 (API 규격).
/// </summary>
public sealed class SeoulOpenApiClient : ISeoulOpenApiClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
    };

    private readonly HttpClient _http;
    private readonly SeoulOpenApiOptions _options;
    private readonly ILogger<SeoulOpenApiClient>? _logger;

    public SeoulOpenApiClient(HttpClient http, IOptions<SeoulOpenApiOptions> options, ILogger<SeoulOpenApiClient>? logger = null)
    {
        _http = http ?? throw new ArgumentNullException(nameof(http));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger;
    }

    public async Task<IReadOnlyList<RawArrivalRow>> GetArrivalsAsync(string stationName, CancellationToken cancellationToken = default)
    {
        var doc = await GetAsync($"realtimeStationArrival/0/20/{Uri.EscapeDataString(stationName)}", cancellationToken).ConfigureAwait(false);
        if (doc is null)
        {
            return [];
        }

        using (doc)
        {
            if (!doc.RootElement.TryGetProperty("realtimeArrivalList", out var list) || list.ValueKind != JsonValueKind.Array)
            {
                return [];
            }

            return list.EnumerateArray().Select(e => new RawArrivalRow(
                Str(e, "subwayId"), Str(e, "updnLine"), Str(e, "trainLineNm"), Str(e, "statnNm"), Str(e, "barvlDt"),
                Str(e, "btrainSttus"), OptStr(e, "btrainNo"), Str(e, "arvlMsg2"), Str(e, "arvlMsg3"), Str(e, "arvlCd"),
                Str(e, "bstatnNm"), Str(e, "recptnDt"))).ToList();
        }
    }

    public async Task<IReadOnlyList<RawPositionRow>> GetPositionsAsync(string lineName, CancellationToken cancellationToken = default)
    {
        var doc = await GetAsync($"realtimePosition/0/100/{Uri.EscapeDataString(lineName)}", cancellationToken).ConfigureAwait(false);
        if (doc is null)
        {
            return [];
        }

        using (doc)
        {
            if (!doc.RootElement.TryGetProperty("realtimePositionList", out var list) || list.ValueKind != JsonValueKind.Array)
            {
                return [];
            }

            return list.EnumerateArray().Select(e => new RawPositionRow(
                Str(e, "subwayId"), Str(e, "subwayNm"), Str(e, "statnId"), Str(e, "statnNm"), Str(e, "trainNo"),
                Str(e, "lastRecptnDt"), Str(e, "recptnDt"), Str(e, "updnLine"), Str(e, "statnTid"), Str(e, "statnTnm"),
                Str(e, "trainSttus"), Str(e, "directAt"), Str(e, "lstcarAt"))).ToList();
        }
    }

    private async Task<JsonDocument?> GetAsync(string servicePath, CancellationToken cancellationToken)
    {
        if (!_options.IsConfigured)
        {
            throw new SeoulApiException(SeoulApiErrorKind.Auth, null, "서울 열린데이터광장 인증키가 설정되지 않았습니다.");
        }

        var url = $"{_options.BaseUrl.TrimEnd('/')}/api/subway/{Uri.EscapeDataString(_options.ApiKey!)}/json/{servicePath}";
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));
        JsonDocument doc;
        try
        {
            using var response = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, timeout.Token).ConfigureAwait(false);
            response.EnsureSuccessStatusCode();
            await using var stream = await response.Content.ReadAsStreamAsync(timeout.Token).ConfigureAwait(false);
            doc = await JsonDocument.ParseAsync(stream, cancellationToken: timeout.Token).ConfigureAwait(false);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new SeoulApiException(SeoulApiErrorKind.Timeout, null, "서울 API 응답이 시간 안에 오지 않았습니다.");
        }
        catch (HttpRequestException ex)
        {
            throw new SeoulApiException(SeoulApiErrorKind.Network, null, $"서울 API 호출 실패: {ex.Message}");
        }

        // 오류 응답은 { errorMessage: { code, message } } 또는 { code, message } 두 형태가 있습니다.
        var root = doc.RootElement;
        string? code = null;
        string? message = null;
        if (root.TryGetProperty("errorMessage", out var err) && err.ValueKind == JsonValueKind.Object)
        {
            code = OptStr(err, "code");
            message = OptStr(err, "message");
        }
        else if (root.TryGetProperty("code", out _))
        {
            code = OptStr(root, "code");
            message = OptStr(root, "message");
        }

        if (code is null || code == "INFO-000")
        {
            return doc;
        }

        doc.Dispose();
        if (code == "INFO-200")
        {
            _logger?.LogDebug("서울 API: 해당하는 데이터가 없습니다 ({Path}).", servicePath);
            return null;
        }

        throw new SeoulApiException(SeoulApiException.Classify(code), code, message ?? code);
    }

    private static string Str(JsonElement e, string name) => OptStr(e, name) ?? string.Empty;

    private static string? OptStr(JsonElement e, string name)
    {
        if (!e.TryGetProperty(name, out var p))
        {
            return null;
        }

        return p.ValueKind switch
        {
            JsonValueKind.String => p.GetString(),
            JsonValueKind.Number => p.GetRawText(),
            JsonValueKind.Null or JsonValueKind.Undefined => null,
            _ => p.GetRawText(),
        };
    }
}

/// <summary>
/// 공공데이터포털 클라이언트 — 빠른하차정보(15143840), 지하철알림정보(15144070).
/// 두 API 의 응답 필드명은 활용신청 후 Swagger 로 확인해야 하므로, 파싱은 느슨하게(이름 후보 여러 개) 합니다.
/// </summary>
public interface IDataGoKrClient
{
    bool IsConfigured { get; }

    Task<IReadOnlyList<FastExit>> GetFastExitsAsync(string lineNo, string stationCd, string stationName, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DisruptionNotice>> GetNoticesAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// HttpClient 기반 구현.
/// </summary>
public sealed class DataGoKrClient : IDataGoKrClient
{
    private readonly HttpClient _http;
    private readonly DataGoKrOptions _options;
    private readonly ILogger<DataGoKrClient>? _logger;

    public DataGoKrClient(HttpClient http, IOptions<DataGoKrOptions> options, ILogger<DataGoKrClient>? logger = null)
    {
        _http = http ?? throw new ArgumentNullException(nameof(http));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger;
    }

    public bool IsConfigured => _options.IsConfigured;

    public async Task<IReadOnlyList<FastExit>> GetFastExitsAsync(string lineNo, string stationCd, string stationName, CancellationToken cancellationToken = default)
    {
        var items = await GetItemsAsync("/B553766/quickExit/getQuickExitInfo", $"lineNo={Uri.EscapeDataString(lineNo)}&stationCd={Uri.EscapeDataString(stationCd)}", cancellationToken).ConfigureAwait(false);
        var now = DateTimeOffset.UtcNow;
        var rows = new List<FastExit>();
        foreach (var item in items)
        {
            var door = DoorPosition.Parse(Pick(item, "carNo", "carNum", "CAR_NO"), Pick(item, "doorNo", "doorNum", "DOOR_NO"));
            if (door is null)
            {
                continue;
            }

            rows.Add(new FastExit(
                lineNo,
                stationCd,
                stationName,
                Pick(item, "updnLine", "direction", "UPDN_LINE") ?? string.Empty,
                door,
                Pick(item, "facilityKind", "fcltKind", "FCLT_KIND") ?? string.Empty,
                Pick(item, "facilityNm", "fcltNm", "FCLT_NM", "exitNo") ?? string.Empty,
                now));
        }

        return rows;
    }

    public async Task<IReadOnlyList<DisruptionNotice>> GetNoticesAsync(CancellationToken cancellationToken = default)
    {
        var items = await GetItemsAsync("/B553766/alarm/getAlarmInfo", string.Empty, cancellationToken).ConfigureAwait(false);
        var now = DateTimeOffset.UtcNow;
        var rows = new List<DisruptionNotice>();
        foreach (var item in items)
        {
            var title = Pick(item, "title", "ttl", "TITLE") ?? string.Empty;
            var starts = ParseDate(Pick(item, "startDt", "bgngDt", "START_DT")) ?? now;
            // string.GetHashCode 는 프로세스마다 다른 값이라 재시작 뒤 같은 공지가 새 행으로 쌓입니다. 내용 기반 해시를 씁니다.
            var id = Pick(item, "id", "seq", "alarmId") ?? StableNoticeId(starts, title);
            rows.Add(new DisruptionNotice(
                id,
                Pick(item, "lineNo", "line", "LINE_NO"),
                title,
                Pick(item, "content", "cn", "CONTENT") ?? string.Empty,
                Pick(item, "category", "alarmType", "CATEGORY") ?? string.Empty,
                starts,
                ParseDate(Pick(item, "endDt", "END_DT")),
                now));
        }

        return rows;
    }

    private async Task<List<Dictionary<string, JsonElement>>> GetItemsAsync(string path, string query, CancellationToken cancellationToken)
    {
        if (!_options.IsConfigured)
        {
            return [];
        }

        var url = $"{_options.BaseUrl.TrimEnd('/')}{path}?serviceKey={_options.ServiceKey}&type=json&numOfRows=100&pageNo=1{(query.Length > 0 ? "&" + query : string.Empty)}";
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));
        try
        {
            using var doc = await _http.GetFromJsonAsync<JsonDocument>(url, timeout.Token).ConfigureAwait(false);
            if (doc is null)
            {
                return [];
            }

            // 공공데이터포털 표준 응답: response.body.items.item[] 또는 data[] / items[]
            var root = doc.RootElement;
            JsonElement items = default;
            var found = TryPath(root, out items, "response", "body", "items", "item")
                        || TryPath(root, out items, "response", "body", "items")
                        || TryPath(root, out items, "data")
                        || TryPath(root, out items, "items");
            if (!found || items.ValueKind != JsonValueKind.Array)
            {
                return [];
            }

            return items.EnumerateArray()
                .Where(e => e.ValueKind == JsonValueKind.Object)
                .Select(e => e.EnumerateObject().ToDictionary(p => p.Name, p => p.Value.Clone(), StringComparer.OrdinalIgnoreCase))
                .ToList();
        }
        catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException or JsonException)
        {
            _logger?.LogWarning(ex, "공공데이터포털 호출 실패: {Path}", path);
            return [];
        }
    }

    private static bool TryPath(JsonElement root, out JsonElement result, params string[] path)
    {
        result = root;
        foreach (var segment in path)
        {
            if (result.ValueKind != JsonValueKind.Object || !result.TryGetProperty(segment, out result))
            {
                return false;
            }
        }

        return true;
    }

    private static string? Pick(Dictionary<string, JsonElement> item, params string[] names)
    {
        foreach (var name in names)
        {
            if (item.TryGetValue(name, out var v) && v.ValueKind is JsonValueKind.String or JsonValueKind.Number)
            {
                return v.ValueKind == JsonValueKind.String ? v.GetString() : v.GetRawText();
            }
        }

        return null;
    }

    /// <summary>
    /// 시작 시각 + 제목의 SHA-256 앞 16자. 같은 공지는 언제 받아도 같은 id 입니다.
    /// </summary>
    public static string StableNoticeId(DateTimeOffset startsAt, string title)
    {
        var bytes = System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes($"{startsAt.ToUniversalTime():O}|{title}"));
        return Convert.ToHexString(bytes)[..16].ToLowerInvariant();
    }

    /// <summary>
    /// 공공데이터포털은 오프셋 없는 한국 시각 문자열을 줍니다. 서버가 어느 시간대에 있든 KST 로 해석하고,
    /// 오프셋이나 Z 가 붙어 있으면 그대로 믿습니다.
    /// </summary>
    public static DateTimeOffset? ParseDate(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        var trimmed = text.Trim();
        var hasOffset = trimmed.EndsWith('Z') || System.Text.RegularExpressions.Regex.IsMatch(trimmed, @"[+-]\d{2}:?\d{2}$");
        if (hasOffset)
        {
            return DateTimeOffset.TryParse(trimmed, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var withOffset)
                ? withOffset
                : null;
        }

        if (DateTime.TryParse(trimmed, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var local))
        {
            var unspecified = DateTime.SpecifyKind(local, DateTimeKind.Unspecified);
            return new DateTimeOffset(unspecified, Time.KoreaClock.Zone.GetUtcOffset(unspecified));
        }

        return null;
    }
}