using System.Security.Cryptography;

namespace Jinobald.Subway.Core.Ingestion;

/// <summary>
/// 파일 내용의 SHA-256. 같은 값이면 다시 적재하지 않습니다.
/// </summary>
public static class Checksum
{
    public static async Task<string> Sha256Async(Stream stream, CancellationToken cancellationToken = default)
    {
        var hash = await SHA256.HashDataAsync(stream, cancellationToken).ConfigureAwait(false);
        return Convert.ToHexStringLower(hash);
    }
}
