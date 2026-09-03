using System.Text;

namespace Jinobald.Subway.Core.Ingestion;

/// <summary>
/// RFC 4180 수준의 작은 CSV 리더. 큰따옴표 필드, 필드 안의 콤마·줄바꿈·이중 따옴표를 처리합니다.
/// 외부 의존성 없이 공공데이터 CSV(43만 행)를 스트리밍으로 읽기 위해 둡니다.
/// </summary>
public static class CsvReader
{
    /// <summary>
    /// 첫 줄을 헤더로 읽고, 이후 각 행을 (헤더 → 값) 사전으로 돌려줍니다. BOM 은 무시합니다.
    /// </summary>
    public static async IAsyncEnumerable<IReadOnlyDictionary<string, string>> ReadRecordsAsync(
        Stream stream,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        using var reader = new StreamReader(stream, new UTF8Encoding(false), detectEncodingFromByteOrderMarks: true, leaveOpen: true);
        string[]? header = null;
        await foreach (var fields in ReadRowsAsync(reader, cancellationToken).ConfigureAwait(false))
        {
            if (header is null)
            {
                header = fields.Select(f => f.Trim()).ToArray();
                continue;
            }

            if (fields.Count == 1 && fields[0].Length == 0)
            {
                continue; // 빈 줄
            }

            var record = new Dictionary<string, string>(header.Length, StringComparer.Ordinal);
            for (var i = 0; i < header.Length; i++)
            {
                record[header[i]] = i < fields.Count ? fields[i] : string.Empty;
            }

            yield return record;
        }
    }

    /// <summary>
    /// 행 단위 필드 목록. 따옴표 안의 줄바꿈을 지원하기 위해 문자 단위로 읽습니다.
    /// </summary>
    public static async IAsyncEnumerable<IReadOnlyList<string>> ReadRowsAsync(
        TextReader reader,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var fields = new List<string>();
        var field = new StringBuilder();
        var inQuotes = false;
        var buffer = new char[64 * 1024];
        int read;
        var pendingRow = false;
        while ((read = await reader.ReadAsync(buffer.AsMemory(), cancellationToken).ConfigureAwait(false)) > 0)
        {
            for (var i = 0; i < read; i++)
            {
                var c = buffer[i];
                if (inQuotes)
                {
                    if (c == '"')
                    {
                        // 이중 따옴표는 이스케이프. 다음 문자를 미리 보기 위해 버퍼 경계를 넘길 수 있으므로 상태로 처리합니다.
                        if (i + 1 < read && buffer[i + 1] == '"')
                        {
                            field.Append('"');
                            i++;
                        }
                        else
                        {
                            inQuotes = false;
                        }
                    }
                    else
                    {
                        field.Append(c);
                    }

                    continue;
                }

                switch (c)
                {
                    case '"':
                        inQuotes = true;
                        break;
                    case ',':
                        fields.Add(field.ToString());
                        field.Clear();
                        pendingRow = true;
                        break;
                    case '\r':
                        break;
                    case '\n':
                        fields.Add(field.ToString());
                        field.Clear();
                        yield return fields.ToArray();
                        fields.Clear();
                        pendingRow = false;
                        break;
                    default:
                        field.Append(c);
                        pendingRow = true;
                        break;
                }
            }
        }

        if (pendingRow || field.Length > 0)
        {
            fields.Add(field.ToString());
            yield return fields.ToArray();
        }
    }
}
