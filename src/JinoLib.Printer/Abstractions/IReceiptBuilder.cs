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
    IReceiptBuilder Bold();
    IReceiptBuilder BoldOff();
    IReceiptBuilder Underline(UnderlineMode mode = UnderlineMode.Single);
    IReceiptBuilder Reverse();
    IReceiptBuilder ReverseOff();
    IReceiptBuilder ResetStyle();

    #endregion

    #region 텍스트 레이아웃

    IReceiptBuilder LeftRight(string left, string right);
    IReceiptBuilder ThreeColumns(string left, string center, string right, int leftWidth = 20, int centerWidth = 8);
    IReceiptBuilder SetWidth(int characters);

    #endregion

    #region 구분선

    IReceiptBuilder Separator(char character = '-');
    IReceiptBuilder DoubleSeparator();
    IReceiptBuilder DottedSeparator();

    #endregion

    #region 이미지

    IReceiptBuilder Image(string imagePath, int maxWidth = 576, bool useDithering = false);
    IReceiptBuilder Image(byte[] imageData, int maxWidth = 576, bool useDithering = false);

    #endregion

    #region 바코드

    IReceiptBuilder Barcode(string data, BarcodeType type, int height = 80, int width = 2, bool showText = true);
    IReceiptBuilder QrCode(string data, int moduleSize = 4, QrCodeErrorCorrection errorCorrection = QrCodeErrorCorrection.M, QrCodeModel model = QrCodeModel.Model2);

    #endregion

    #region 제어 명령

    IReceiptBuilder Feed(int lines = 1);
    IReceiptBuilder Cut(CutType type = CutType.Full);
    IReceiptBuilder FeedAndCut(int lines = 3, CutType cutType = CutType.Full);
    IReceiptBuilder OpenCashDrawer(CashDrawerPin pin = CashDrawerPin.Pin2);
    IReceiptBuilder Beep(int count = 1, int duration = 3);

    #endregion

    #region 한글/코드페이지

    IReceiptBuilder EnableKorean();
    IReceiptBuilder DisableKorean();
    IReceiptBuilder SelectCodePage(CodePage codePage);

    #endregion
}
