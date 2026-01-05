using System.Drawing;
using System.Text;
using JinoLib.Printer.Abstractions;
using JinoLib.Printer.Commands;
using JinoLib.Printer.Commands.Enums;
using JinoLib.Printer.Encoding;
using JinoLib.Printer.Imaging;

namespace JinoLib.Printer.Builders;

/// <summary>
/// ESC/POS 영수증 빌더 (Fluent API)
/// </summary>
public class ReceiptBuilder : IReceiptBuilder
{
    private readonly List<byte> _buffer = [];
    private int _printerWidth = 48; // 기본 80mm 프린터 기준 48자
    private bool _koreanMode;

    /// <summary>
    /// 현재 버퍼 크기
    /// </summary>
    public int Length => _buffer.Count;

    #region 초기화

    /// <summary>
    /// 프린터 초기화
    /// </summary>
    public IReceiptBuilder Initialize()
    {
        _buffer.AddRange(EscPosCommands.Initialize);
        _koreanMode = false;
        return this;
    }

    /// <summary>
    /// 프린터 폭 설정 (문자 수)
    /// </summary>
    /// <param name="characters">줄당 문자 수 (기본값: 48)</param>
    public IReceiptBuilder SetWidth(int characters)
    {
        _printerWidth = characters;
        return this;
    }

    #endregion

    #region 텍스트 출력

    /// <summary>
    /// 텍스트 출력 (줄바꿈 없음)
    /// </summary>
    public IReceiptBuilder Text(string text)
    {
        var encoded = _koreanMode
            ? KoreanEncoder.EncodeMixed(text)
            : System.Text.Encoding.ASCII.GetBytes(text);
        _buffer.AddRange(encoded);
        return this;
    }

    /// <summary>
    /// 텍스트 출력 후 줄바꿈
    /// </summary>
    public IReceiptBuilder Line(string text)
    {
        Text(text);
        _buffer.AddRange(EscPosCommands.LF);
        return this;
    }

    /// <summary>
    /// 빈 줄 출력
    /// </summary>
    public IReceiptBuilder NewLine(int count = 1)
    {
        for (var i = 0; i < count; i++)
        {
            _buffer.AddRange(EscPosCommands.LF);
        }
        return this;
    }

    /// <summary>
    /// 왼쪽-오른쪽 정렬 텍스트 (영수증 항목용)
    /// </summary>
    public IReceiptBuilder LeftRight(string left, string right)
    {
        var padding = _printerWidth - left.Length - right.Length;
        if (padding < 1) padding = 1;

        var line = left + new string(' ', padding) + right;
        return Line(line);
    }

    /// <summary>
    /// 3분할 텍스트 (품명-수량-금액 등)
    /// </summary>
    public IReceiptBuilder ThreeColumns(string left, string center, string right, int leftWidth = 20, int centerWidth = 8)
    {
        var rightWidth = _printerWidth - leftWidth - centerWidth;

        var leftPadded = left.PadRight(leftWidth)[..leftWidth];
        var centerPadded = center.PadLeft(centerWidth);
        var rightPadded = right.PadLeft(rightWidth);

        return Line(leftPadded + centerPadded + rightPadded);
    }

    #endregion

    #region 텍스트 스타일

    /// <summary>
    /// 굵은 글씨 시작
    /// </summary>
    public IReceiptBuilder Bold()
    {
        _buffer.AddRange(EscPosCommands.BoldOn);
        return this;
    }

    /// <summary>
    /// 굵은 글씨 종료
    /// </summary>
    public IReceiptBuilder BoldOff()
    {
        _buffer.AddRange(EscPosCommands.BoldOff);
        return this;
    }

    /// <summary>
    /// 밑줄 설정
    /// </summary>
    public IReceiptBuilder Underline(UnderlineMode mode = UnderlineMode.Single)
    {
        var command = mode switch
        {
            UnderlineMode.None => EscPosCommands.UnderlineOff,
            UnderlineMode.Single => EscPosCommands.UnderlineSingle,
            UnderlineMode.Double => EscPosCommands.UnderlineDouble,
            _ => EscPosCommands.UnderlineOff
        };
        _buffer.AddRange(command);
        return this;
    }

    /// <summary>
    /// 반전 모드 시작
    /// </summary>
    public IReceiptBuilder Reverse()
    {
        _buffer.AddRange(EscPosCommands.ReverseOn);
        return this;
    }

    /// <summary>
    /// 반전 모드 종료
    /// </summary>
    public IReceiptBuilder ReverseOff()
    {
        _buffer.AddRange(EscPosCommands.ReverseOff);
        return this;
    }

    /// <summary>
    /// 글꼴 크기 설정
    /// </summary>
    public IReceiptBuilder FontSize(FontSize size)
    {
        var (width, height) = size switch
        {
            Commands.Enums.FontSize.Normal => (0, 0),
            Commands.Enums.FontSize.DoubleWidth => (1, 0),
            Commands.Enums.FontSize.DoubleHeight => (0, 1),
            Commands.Enums.FontSize.Double => (1, 1),
            Commands.Enums.FontSize.TripleWidth => (2, 0),
            Commands.Enums.FontSize.TripleHeight => (0, 2),
            Commands.Enums.FontSize.Triple => (2, 2),
            Commands.Enums.FontSize.QuadWidth => (3, 0),
            Commands.Enums.FontSize.QuadHeight => (0, 3),
            Commands.Enums.FontSize.Quad => (3, 3),
            _ => (0, 0)
        };

        _buffer.AddRange(EscPosCommands.CharacterSize(width, height));
        return this;
    }

    /// <summary>
    /// 모든 스타일 초기화
    /// </summary>
    public IReceiptBuilder ResetStyle()
    {
        _buffer.AddRange(EscPosCommands.BoldOff);
        _buffer.AddRange(EscPosCommands.UnderlineOff);
        _buffer.AddRange(EscPosCommands.ReverseOff);
        _buffer.AddRange(EscPosCommands.CharacterSize(0, 0));
        _buffer.AddRange(EscPosCommands.AlignLeft);
        return this;
    }

    #endregion

    #region 정렬

    /// <summary>
    /// 텍스트 정렬 설정
    /// </summary>
    public IReceiptBuilder Align(Alignment alignment)
    {
        var command = alignment switch
        {
            Alignment.Left => EscPosCommands.AlignLeft,
            Alignment.Center => EscPosCommands.AlignCenter,
            Alignment.Right => EscPosCommands.AlignRight,
            _ => EscPosCommands.AlignLeft
        };
        _buffer.AddRange(command);
        return this;
    }

    #endregion

    #region 구분선

    /// <summary>
    /// 단일 구분선 (-로 채움)
    /// </summary>
    public IReceiptBuilder Separator(char character = '-')
    {
        return Line(new string(character, _printerWidth));
    }

    /// <summary>
    /// 이중 구분선 (=로 채움)
    /// </summary>
    public IReceiptBuilder DoubleSeparator()
    {
        return Separator('=');
    }

    /// <summary>
    /// 점선 구분선
    /// </summary>
    public IReceiptBuilder DottedSeparator()
    {
        return Separator('.');
    }

    #endregion

    #region 용지 제어

    /// <summary>
    /// 줄 단위 피드
    /// </summary>
    public IReceiptBuilder Feed(int lines = 1)
    {
        if (lines <= 0) return this;

        if (lines <= 255)
        {
            _buffer.AddRange(EscPosCommands.FeedLines((byte)lines));
        }
        else
        {
            for (var i = 0; i < lines; i++)
            {
                _buffer.AddRange(EscPosCommands.LF);
            }
        }
        return this;
    }

    /// <summary>
    /// 용지 절단
    /// </summary>
    public IReceiptBuilder Cut(CutType cutType = CutType.Full)
    {
        var command = cutType switch
        {
            CutType.Full => EscPosCommands.CutFull,
            CutType.Partial => EscPosCommands.CutPartial,
            _ => EscPosCommands.CutFull
        };
        _buffer.AddRange(command);
        return this;
    }

    /// <summary>
    /// 피드 후 절단
    /// </summary>
    public IReceiptBuilder FeedAndCut(int lines = 3, CutType cutType = CutType.Full)
    {
        Feed(lines);
        return Cut(cutType);
    }

    #endregion

    #region 캐시드로워

    /// <summary>
    /// 캐시드로워 열기
    /// </summary>
    public IReceiptBuilder OpenCashDrawer(CashDrawerPin pin = CashDrawerPin.Pin2)
    {
        _buffer.AddRange(EscPosCommands.OpenCashDrawer((byte)pin));
        return this;
    }

    #endregion

    #region 비프음

    /// <summary>
    /// 비프음 출력
    /// </summary>
    public IReceiptBuilder Beep(int count = 1, int duration = 3)
    {
        _buffer.AddRange(EscPosCommands.Beep((byte)count, (byte)duration));
        return this;
    }

    #endregion

    #region 한글

    /// <summary>
    /// 한글 모드 활성화
    /// </summary>
    public IReceiptBuilder EnableKorean()
    {
        _buffer.AddRange(EscPosCommands.KoreanModeOn);
        _koreanMode = true;
        return this;
    }

    /// <summary>
    /// 한글 모드 비활성화
    /// </summary>
    public IReceiptBuilder DisableKorean()
    {
        _buffer.AddRange(EscPosCommands.KoreanModeOff);
        _koreanMode = false;
        return this;
    }

    /// <summary>
    /// 코드페이지 선택
    /// </summary>
    public IReceiptBuilder SelectCodePage(CodePage codePage)
    {
        _buffer.AddRange(EscPosCommands.SelectCodePage((byte)codePage));
        return this;
    }

    #endregion

    #region 바코드

    /// <summary>
    /// 바코드 출력
    /// </summary>
    public IReceiptBuilder Barcode(string data, BarcodeType type, int height = 80, int width = 2, bool showText = true)
    {
        // 바코드 높이 설정
        _buffer.AddRange(EscPosCommands.Barcode.SetHeight((byte)height));

        // 바코드 너비 설정 (2-6)
        _buffer.AddRange(EscPosCommands.Barcode.SetWidth((byte)Math.Clamp(width, 2, 6)));

        // HRI 위치 (0: 없음, 1: 위, 2: 아래, 3: 위+아래)
        _buffer.AddRange(EscPosCommands.Barcode.SetHriPosition((byte)(showText ? 2 : 0)));

        // 바코드 데이터 출력
        var barcodeData = System.Text.Encoding.ASCII.GetBytes(data);
        _buffer.AddRange(EscPosCommands.Barcode.Print((byte)type, barcodeData));

        return this;
    }

    #endregion

    #region QR코드

    /// <summary>
    /// QR코드 출력
    /// </summary>
    public IReceiptBuilder QrCode(string data, int moduleSize = 4, QrCodeErrorCorrection errorCorrection = QrCodeErrorCorrection.M, QrCodeModel model = QrCodeModel.Model2)
    {
        // 모델 선택
        _buffer.AddRange(EscPosCommands.QrCode.SetModel((byte)model));

        // 모듈 크기 (1-16)
        _buffer.AddRange(EscPosCommands.QrCode.SetModuleSize((byte)Math.Clamp(moduleSize, 1, 16)));

        // 오류 정정 레벨
        _buffer.AddRange(EscPosCommands.QrCode.SetErrorCorrection((byte)errorCorrection));

        // 데이터 저장
        var qrData = System.Text.Encoding.UTF8.GetBytes(data);
        _buffer.AddRange(EscPosCommands.QrCode.StoreData(qrData));

        // 출력
        _buffer.AddRange(EscPosCommands.QrCode.Print);

        return this;
    }

    #endregion

    #region 이미지

    /// <summary>
    /// 이미지 출력 (파일 경로)
    /// </summary>
    public IReceiptBuilder Image(string imagePath, int maxWidth = ImageProcessor.DefaultPrinterWidth, bool useDithering = false)
    {
        var rasterData = ImageProcessor.ProcessImage(imagePath, maxWidth, useDithering: useDithering);
        _buffer.AddRange(ImageProcessor.ToEscPosCommand(rasterData));
        return this;
    }

    /// <summary>
    /// 이미지 출력 (Image 객체)
    /// </summary>
    public IReceiptBuilder Image(Image image, int maxWidth = ImageProcessor.DefaultPrinterWidth, bool useDithering = false)
    {
        var rasterData = ImageProcessor.ProcessImage(image, maxWidth, useDithering: useDithering);
        _buffer.AddRange(ImageProcessor.ToEscPosCommand(rasterData));
        return this;
    }

    /// <summary>
    /// 이미지 출력 (바이트 배열)
    /// </summary>
    public IReceiptBuilder Image(byte[] imageData, int maxWidth = ImageProcessor.DefaultPrinterWidth, bool useDithering = false)
    {
        var rasterData = ImageProcessor.ProcessImage(imageData, maxWidth, useDithering: useDithering);
        _buffer.AddRange(ImageProcessor.ToEscPosCommand(rasterData));
        return this;
    }

    #endregion

    #region Raw 데이터

    /// <summary>
    /// 원시 바이트 추가
    /// </summary>
    public IReceiptBuilder Raw(params byte[] data)
    {
        _buffer.AddRange(data);
        return this;
    }

    /// <summary>
    /// 원시 바이트 배열 추가
    /// </summary>
    public IReceiptBuilder Raw(ReadOnlySpan<byte> data)
    {
        _buffer.AddRange(data.ToArray());
        return this;
    }

    #endregion

    #region 빌드

    /// <summary>
    /// 버퍼를 바이트 배열로 빌드
    /// </summary>
    public byte[] Build()
    {
        return [.. _buffer];
    }

    /// <summary>
    /// 버퍼를 ReadOnlyMemory로 빌드
    /// </summary>
    public ReadOnlyMemory<byte> BuildAsMemory()
    {
        return Build();
    }

    /// <summary>
    /// 버퍼 초기화
    /// </summary>
    public IReceiptBuilder Clear()
    {
        _buffer.Clear();
        _koreanMode = false;
        return this;
    }

    #endregion
}
