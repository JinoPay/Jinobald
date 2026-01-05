using JinoLib.Printer.Encoding;
using Xunit;

namespace JinoLib.Printer.Tests.Encoding;

/// <summary>
/// KoreanEncoder 단위 테스트
/// </summary>
public class KoreanEncoderTests
{
    [Fact]
    public void ContainsKorean_Should_Return_True_For_Korean_Text()
    {
        Assert.True(KoreanEncoder.ContainsKorean("안녕하세요"));
        Assert.True(KoreanEncoder.ContainsKorean("Hello 세계"));
        Assert.True(KoreanEncoder.ContainsKorean("ㄱㄴㄷ"));
        Assert.True(KoreanEncoder.ContainsKorean("ㅏㅓㅗ"));
    }

    [Fact]
    public void ContainsKorean_Should_Return_False_For_Non_Korean_Text()
    {
        Assert.False(KoreanEncoder.ContainsKorean("Hello World"));
        Assert.False(KoreanEncoder.ContainsKorean("12345"));
        Assert.False(KoreanEncoder.ContainsKorean("!@#$%"));
        Assert.False(KoreanEncoder.ContainsKorean(""));
    }

    [Fact]
    public void EncodeCp949_Should_Encode_Korean_Text()
    {
        // Arrange
        var text = "가";

        // Act
        var result = KoreanEncoder.EncodeCp949(text);

        // Assert
        // CP949에서 '가' = 0xB0A1
        Assert.Equal(2, result.Length);
        Assert.Equal(0xB0, result[0]);
        Assert.Equal(0xA1, result[1]);
    }

    [Fact]
    public void EncodeUtf8_Should_Encode_Korean_Text()
    {
        // Arrange
        var text = "가";

        // Act
        var result = KoreanEncoder.EncodeUtf8(text);

        // Assert
        // UTF-8에서 '가' = 0xEA 0xB0 0x80
        Assert.Equal(3, result.Length);
        Assert.Equal(0xEA, result[0]);
        Assert.Equal(0xB0, result[1]);
        Assert.Equal(0x80, result[2]);
    }

    [Fact]
    public void EncodeAuto_Should_Use_Cp949_For_Korean()
    {
        // Arrange
        var text = "안녕";

        // Act
        var result = KoreanEncoder.EncodeAuto(text);

        // Assert
        // CP949 인코딩 결과
        Assert.Equal(4, result.Length);
    }

    [Fact]
    public void EncodeAuto_Should_Use_Ascii_For_English()
    {
        // Arrange
        var text = "Hello";

        // Act
        var result = KoreanEncoder.EncodeAuto(text);

        // Assert
        Assert.Equal("Hello"u8.ToArray(), result);
    }

    [Fact]
    public void EncodeWithKoreanMode_Should_Add_Mode_Commands()
    {
        // Arrange
        var text = "가";

        // Act
        var result = KoreanEncoder.EncodeWithKoreanMode(text);

        // Assert
        // FS & (0x1C 0x26) + "가" (2 bytes) + FS . (0x1C 0x2E)
        Assert.Equal(6, result.Length);
        Assert.Equal(0x1C, result[0]); // FS
        Assert.Equal(0x26, result[1]); // &
        Assert.Equal(0x1C, result[^2]); // FS
        Assert.Equal(0x2E, result[^1]); // .
    }

    [Fact]
    public void EncodeMixed_Should_Handle_Mixed_Text()
    {
        // Arrange
        var text = "Hello안녕World";

        // Act
        var result = KoreanEncoder.EncodeMixed(text);

        // Assert
        // 결과에는 모드 전환 명령과 텍스트가 포함됨
        Assert.True(result.Length > text.Length);
        // 한글 모드 진입 명령 (FS &)이 포함되어야 함
        Assert.Contains(result, b => b == 0x1C);
    }
}
