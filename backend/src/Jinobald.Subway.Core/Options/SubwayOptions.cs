namespace Jinobald.Subway.Core.Options;

/// <summary>
/// 서울 열린데이터광장 실시간 API. <c>ApiKey</c> 가 비어 있으면 시각표 시뮬레이터가 대신 동작합니다.
/// 설정 키: <c>Seoul:ApiKey</c> (환경변수 <c>Seoul__ApiKey</c>).
/// </summary>
public sealed class SeoulOpenApiOptions
{
    public const string SectionName = "Seoul";

    public string? ApiKey { get; set; }

    public string BaseUrl { get; set; } = "http://swopenapi.seoul.go.kr";

    public int TimeoutSeconds { get; set; } = 8;

    /// <summary>
    /// 인증키의 일일 호출 한도. 무료 키는 1,000 입니다.
    /// </summary>
    public int DailyQuota { get; set; } = 1000;

    /// <summary>
    /// 이 값 이상 쓰면 새 호출을 멈추고 오래된 캐시를 내보냅니다.
    /// </summary>
    public int SoftLimit { get; set; } = 900;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);
}

/// <summary>
/// 공공데이터포털(data.go.kr) 서비스키. 빠른하차정보·지하철알림정보에 씁니다.
/// 설정 키: <c>DataGoKr:ServiceKey</c>.
/// </summary>
public sealed class DataGoKrOptions
{
    public const string SectionName = "DataGoKr";

    public string? ServiceKey { get; set; }

    public string BaseUrl { get; set; } = "https://apis.data.go.kr";

    public int TimeoutSeconds { get; set; } = 8;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ServiceKey);
}

/// <summary>
/// 실시간 캐시 정책.
/// </summary>
public sealed class RealtimeOptions
{
    public const string SectionName = "Realtime";

    public int ArrivalsTtlSeconds { get; set; } = 20;

    public int PositionsTtlSeconds { get; set; } = 30;

    /// <summary>
    /// 시뮬레이터가 도착정보를 합성할 때 내다보는 시간(초).
    /// </summary>
    public int SimulatedArrivalWindowSeconds { get; set; } = 1800;
}

/// <summary>
/// 데이터셋 위치와 시작 시 적재 여부.
/// </summary>
public sealed class DatasetOptions
{
    public const string SectionName = "Datasets";

    /// <summary>
    /// 원본 CSV 디렉터리 (<c>scripts/data/raw</c>).
    /// </summary>
    public string? RawDir { get; set; }

    /// <summary>
    /// API 시작 시 RawDir 를 적재할지. 체크섬이 같으면 건너뛰므로 켜 두어도 비용이 없습니다.
    /// </summary>
    public bool ImportOnStartup { get; set; } = true;
}

/// <summary>
/// 시각표 요일 판정에 쓰는 공휴일 목록 (yyyy-MM-dd).
/// </summary>
public sealed class TimetableOptions
{
    public const string SectionName = "Timetable";

    public List<string> Holidays { get; set; } = [];
}
