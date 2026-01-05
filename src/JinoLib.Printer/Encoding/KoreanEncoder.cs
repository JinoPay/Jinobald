using System.Text;

namespace JinoLib.Printer.Encoding;

/// <summary>
/// 한글 인코딩 처리기
/// </summary>
public static class KoreanEncoder
{
    private static readonly System.Text.Encoding Cp949;
    private static readonly System.Text.Encoding EucKr;

    static KoreanEncoder()
    {
        // CodePages 등록 (필수)
        System.Text.Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

        Cp949 = System.Text.Encoding.GetEncoding(949);
        EucKr = System.Text.Encoding.GetEncoding(51949);
    }

    /// <summary>
    /// 문자열을 CP949로 인코딩
    /// </summary>
    public static byte[] EncodeCp949(string text) => Cp949.GetBytes(text);

    /// <summary>
    /// 문자열을 EUC-KR로 인코딩
    /// </summary>
    public static byte[] EncodeEucKr(string text) => EucKr.GetBytes(text);

    /// <summary>
    /// 문자열을 지정된 코드페이지로 인코딩
    /// </summary>
    public static byte[] Encode(string text, int codePage)
    {
        var encoding = System.Text.Encoding.GetEncoding(codePage);
        return encoding.GetBytes(text);
    }

    /// <summary>
    /// 문자열을 UTF-8로 인코딩
    /// </summary>
    public static byte[] EncodeUtf8(string text) => System.Text.Encoding.UTF8.GetBytes(text);

    /// <summary>
    /// 한글 여부 확인
    /// </summary>
    public static bool ContainsKorean(string text)
    {
        foreach (var c in text)
        {
            // 한글 유니코드 범위
            // 가-힣: U+AC00 ~ U+D7AF
            // ㄱ-ㅎ: U+3131 ~ U+314E
            // ㅏ-ㅣ: U+314F ~ U+3163
            if ((c >= '\uAC00' && c <= '\uD7AF') ||
                (c >= '\u3131' && c <= '\u318E'))
            {
                return true;
            }
        }
        return false;
    }

    /// <summary>
    /// 문자열을 적절한 인코딩으로 변환 (한글 포함시 CP949, 아니면 ASCII)
    /// </summary>
    public static byte[] EncodeAuto(string text)
    {
        if (ContainsKorean(text))
        {
            return EncodeCp949(text);
        }
        return System.Text.Encoding.ASCII.GetBytes(text);
    }

    /// <summary>
    /// 한글 문자열을 ESC/POS 명령과 함께 인코딩
    /// (한글 모드 진입/종료 명령 자동 삽입)
    /// </summary>
    public static byte[] EncodeWithKoreanMode(string text)
    {
        var result = new List<byte>();

        // FS & (한글 모드 진입)
        result.Add(0x1C);
        result.Add(0x26);

        // CP949로 텍스트 인코딩
        result.AddRange(EncodeCp949(text));

        // FS . (한글 모드 종료)
        result.Add(0x1C);
        result.Add(0x2E);

        return [.. result];
    }

    /// <summary>
    /// 혼합 텍스트 인코딩 (한글/영문 자동 전환)
    /// </summary>
    public static byte[] EncodeMixed(string text)
    {
        var result = new List<byte>();
        var isKoreanMode = false;
        var buffer = new StringBuilder();

        foreach (var c in text)
        {
            var isKorean = (c >= '\uAC00' && c <= '\uD7AF') || (c >= '\u3131' && c <= '\u318E');

            if (isKorean != isKoreanMode && buffer.Length > 0)
            {
                // 모드 전환 전 버퍼 플러시
                if (isKoreanMode)
                {
                    result.AddRange(EncodeCp949(buffer.ToString()));
                    result.Add(0x1C); // FS
                    result.Add(0x2E); // . (한글 모드 종료)
                }
                else
                {
                    result.AddRange(System.Text.Encoding.ASCII.GetBytes(buffer.ToString()));
                    result.Add(0x1C); // FS
                    result.Add(0x26); // & (한글 모드 진입)
                }
                buffer.Clear();
                isKoreanMode = isKorean;
            }
            else if (buffer.Length == 0 && isKorean && !isKoreanMode)
            {
                result.Add(0x1C); // FS
                result.Add(0x26); // & (한글 모드 진입)
                isKoreanMode = true;
            }

            buffer.Append(c);
        }

        // 마지막 버퍼 플러시
        if (buffer.Length > 0)
        {
            if (isKoreanMode)
            {
                result.AddRange(EncodeCp949(buffer.ToString()));
                result.Add(0x1C); // FS
                result.Add(0x2E); // . (한글 모드 종료)
            }
            else
            {
                result.AddRange(System.Text.Encoding.ASCII.GetBytes(buffer.ToString()));
            }
        }

        return [.. result];
    }
}
