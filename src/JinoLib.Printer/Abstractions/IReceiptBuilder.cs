using JinoLib.Printer.Commands.Enums;

namespace JinoLib.Printer.Abstractions;

/// <summary>
/// Fluent 영수증 빌더 인터페이스.
/// </summary>
public interface IReceiptBuilder : ICommandBuilder
{
    #region 텍스트 명령

    IReceiptBuilder Text(string text);
    IReceiptBuilder Line(string text);
    IReceiptBuilder NewLine(int count = 1);
    IReceiptBuilder Align(Alignment alignment);
    IReceiptBuilder FontSize(FontSize size);
    IReceiptBuilder FontSize(int widthMagnification, int heightMagnification);
    IReceiptBuilder Bold(bool enabled = true);
    IReceiptBuilder Underline(UnderlineMode mode = UnderlineMode.Single);
    IReceiptBuilder Reverse(bool enabled = true);
    IReceiptBuilder ResetStyle();

    #endregion

    #region 구분선

    IReceiptBuilder Separator(char character = '-', int? width = null);
    IReceiptBuilder DoubleSeparator(int? width = null);

    #endregion

    #region 이미지

    IReceiptBuilder Image(string filePath, ImageDensity density = ImageDensity.Normal);
    IReceiptBuilder Image(ReadOnlySpan<byte> imageData, ImageDensity density = ImageDensity.Normal);
    IReceiptBuilder Image(Stream imageStream, ImageDensity density = ImageDensity.Normal);

    #endregion

    #region 바코드

    IReceiptBuilder Barcode(string data, BarcodeType type, int height = 50, bool showText = true);
    IReceiptBuilder QrCode(string data, int moduleSize = 4, QrCodeErrorCorrection errorCorrection = QrCodeErrorCorrection.L);
    IReceiptBuilder Pdf417(string data, int columnCount = 0, int rowCount = 0);

    #endregion

    #region 제어 명령

    IReceiptBuilder Feed(int lines = 1);
    IReceiptBuilder Cut(CutType type = CutType.Partial);
    IReceiptBuilder OpenCashDrawer(CashDrawerPin pin = CashDrawerPin.Pin2);
    IReceiptBuilder Beep(int count = 1, int duration = 50);

    #endregion

    #region 코드페이지

    IReceiptBuilder SetCodePage(CodePage codePage);
    IReceiptBuilder EnableKorean();

    #endregion
}
