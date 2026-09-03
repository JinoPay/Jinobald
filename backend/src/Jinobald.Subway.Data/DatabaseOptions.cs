namespace Jinobald.Subway.Data;

/// <summary>
/// 데이터베이스 위치. 설정 키 <c>Database:Path</c>. 기본은 실행 디렉터리의 <c>data/subway.db</c>.
/// </summary>
public sealed class DatabaseOptions
{
    public const string SectionName = "Database";

    public string Path { get; set; } = System.IO.Path.Combine("data", "subway.db");
}
