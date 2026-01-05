using JinoLib.Printer.Builders;
using JinoLib.Printer.Commands;
using JinoLib.Printer.Commands.Enums;
using Xunit;

namespace JinoLib.Printer.Tests.Builders;

/// <summary>
/// ReceiptBuilder 단위 테스트
/// </summary>
public class ReceiptBuilderTests
{
    [Fact]
    public void Initialize_Should_Add_Initialize_Command()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.Initialize();
        var result = builder.Build();

        // Assert
        Assert.Equal([0x1B, 0x40], result);
    }

    [Fact]
    public void Text_Should_Add_Ascii_Bytes()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.Text("Hello");
        var result = builder.Build();

        // Assert
        Assert.Equal("Hello"u8.ToArray(), result);
    }

    [Fact]
    public void Line_Should_Add_Text_With_Linefeed()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.Line("Test");
        var result = builder.Build();

        // Assert
        var expected = "Test"u8.ToArray().Concat(new byte[] { 0x0A }).ToArray();
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Bold_Should_Add_Bold_Command()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.Bold();
        var result = builder.Build();

        // Assert
        Assert.Equal([0x1B, 0x45, 0x01], result);
    }

    [Fact]
    public void BoldOff_Should_Add_Bold_Off_Command()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.BoldOff();
        var result = builder.Build();

        // Assert
        Assert.Equal([0x1B, 0x45, 0x00], result);
    }

    [Fact]
    public void Align_Center_Should_Add_Center_Command()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.Align(Alignment.Center);
        var result = builder.Build();

        // Assert
        Assert.Equal([0x1B, 0x61, 0x01], result);
    }

    [Fact]
    public void Align_Right_Should_Add_Right_Command()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.Align(Alignment.Right);
        var result = builder.Build();

        // Assert
        Assert.Equal([0x1B, 0x61, 0x02], result);
    }

    [Fact]
    public void Cut_Full_Should_Add_Full_Cut_Command()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.Cut(CutType.Full);
        var result = builder.Build();

        // Assert
        Assert.Equal([0x1D, 0x56, 0x00], result);
    }

    [Fact]
    public void Cut_Partial_Should_Add_Partial_Cut_Command()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.Cut(CutType.Partial);
        var result = builder.Build();

        // Assert
        Assert.Equal([0x1D, 0x56, 0x01], result);
    }

    [Fact]
    public void Feed_Should_Add_Feed_Command()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.Feed(5);
        var result = builder.Build();

        // Assert
        Assert.Equal([0x1B, 0x64, 0x05], result);
    }

    [Fact]
    public void NewLine_Should_Add_Multiple_Linefeeds()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.NewLine(3);
        var result = builder.Build();

        // Assert
        Assert.Equal([0x0A, 0x0A, 0x0A], result);
    }

    [Fact]
    public void Underline_Single_Should_Add_Underline_Command()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.Underline(UnderlineMode.Single);
        var result = builder.Build();

        // Assert
        Assert.Equal([0x1B, 0x2D, 0x01], result);
    }

    [Fact]
    public void Underline_Double_Should_Add_Double_Underline_Command()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.Underline(UnderlineMode.Double);
        var result = builder.Build();

        // Assert
        Assert.Equal([0x1B, 0x2D, 0x02], result);
    }

    [Fact]
    public void FontSize_Double_Should_Add_Size_Command()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.FontSize(FontSize.Double);
        var result = builder.Build();

        // Assert
        // width=1, height=1 -> (1<<4)|1 = 0x11
        Assert.Equal([0x1D, 0x21, 0x11], result);
    }

    [Fact]
    public void Beep_Should_Add_Beep_Command()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.Beep(2, 5);
        var result = builder.Build();

        // Assert
        Assert.Equal([0x1B, 0x42, 0x02, 0x05], result);
    }

    [Fact]
    public void OpenCashDrawer_Should_Add_Drawer_Command()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.OpenCashDrawer(CashDrawerPin.Pin2);
        var result = builder.Build();

        // Assert
        // Pin2 = 0, default on/off time: 25, 250
        Assert.Equal([0x1B, 0x70, 0x00, 0x19, 0xFA], result);
    }

    [Fact]
    public void EnableKorean_Should_Add_Korean_Mode_Command()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.EnableKorean();
        var result = builder.Build();

        // Assert
        Assert.Equal([0x1C, 0x26], result);
    }

    [Fact]
    public void DisableKorean_Should_Add_Korean_Off_Command()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.DisableKorean();
        var result = builder.Build();

        // Assert
        Assert.Equal([0x1C, 0x2E], result);
    }

    [Fact]
    public void Separator_Should_Add_Line_Of_Characters()
    {
        // Arrange
        var builder = new ReceiptBuilder();
        builder.SetWidth(10);

        // Act
        builder.Separator('-');
        var result = builder.Build();

        // Assert
        var expected = "----------"u8.ToArray().Concat(new byte[] { 0x0A }).ToArray();
        Assert.Equal(expected, result);
    }

    [Fact]
    public void Raw_Should_Add_Raw_Bytes()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.Raw(0x1B, 0x40, 0xFF);
        var result = builder.Build();

        // Assert
        Assert.Equal([0x1B, 0x40, 0xFF], result);
    }

    [Fact]
    public void Clear_Should_Reset_Buffer()
    {
        // Arrange
        var builder = new ReceiptBuilder();
        builder.Text("Hello");

        // Act
        builder.Clear();
        var result = builder.Build();

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public void Fluent_Chain_Should_Build_Complete_Receipt()
    {
        // Arrange & Act
        var builder = new ReceiptBuilder();
        builder
            .Initialize()
            .Align(Alignment.Center)
            .Bold()
            .Line("RECEIPT")
            .BoldOff()
            .ResetStyle()
            .Feed(3)
            .Cut();

        var result = builder.Build();

        // Assert
        Assert.True(result.Length > 0);
        // 첫 2바이트가 Initialize 명령인지 확인
        Assert.Equal(0x1B, result[0]);
        Assert.Equal(0x40, result[1]);
    }

    [Fact]
    public void QrCode_Should_Add_QrCode_Commands()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.QrCode("https://example.com", moduleSize: 4);
        var result = builder.Build();

        // Assert
        // QR 코드 명령이 추가되었는지 확인 (최소 길이 체크)
        Assert.True(result.Length > 20);
        // 첫 명령이 GS ( k (모델 설정)인지 확인
        Assert.Equal(0x1D, result[0]);
        Assert.Equal(0x28, result[1]);
        Assert.Equal(0x6B, result[2]);
    }

    [Fact]
    public void Barcode_Should_Add_Barcode_Commands()
    {
        // Arrange
        var builder = new ReceiptBuilder();

        // Act
        builder.Barcode("123456789012", BarcodeType.Ean13, height: 80, width: 3);
        var result = builder.Build();

        // Assert
        // 바코드 명령이 추가되었는지 확인
        Assert.True(result.Length > 10);
        // 높이 설정 명령 확인
        Assert.Equal(0x1D, result[0]);
        Assert.Equal(0x68, result[1]);
        Assert.Equal(80, result[2]);
    }

    [Fact]
    public void LeftRight_Should_Format_Two_Columns()
    {
        // Arrange
        var builder = new ReceiptBuilder();
        builder.SetWidth(20);

        // Act
        builder.LeftRight("Item", "100");
        var result = builder.Build();

        // Assert
        var text = System.Text.Encoding.ASCII.GetString(result.Take(result.Length - 1).ToArray());
        Assert.Equal(20, text.Length);
        Assert.StartsWith("Item", text);
        Assert.EndsWith("100", text);
    }
}
