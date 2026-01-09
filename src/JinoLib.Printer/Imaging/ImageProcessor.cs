using JinoLib.Printer.Commands.Enums;

namespace JinoLib.Printer.Imaging;

/// <summary>
/// 이미지 처리 팩토리 및 정적 헬퍼 메서드
/// 플랫폼에 따라 적절한 이미지 처리기를 반환합니다.
/// </summary>
public static class ImageProcessor
{
    private static IImageProcessor? _instance;
    private static readonly object _lock = new();

    /// <summary>
    /// 기본 프린터 폭 (픽셀) - 80mm 프린터 기준 576 dots
    /// </summary>
    public const int DefaultPrinterWidth = 576;

    /// <summary>
    /// 현재 플랫폼에 맞는 이미지 처리기 인스턴스
    /// </summary>
    public static IImageProcessor Instance
    {
        get
        {
            if (_instance == null)
            {
                lock (_lock)
                {
                    if (_instance == null)
                    {
#if WINDOWS_BUILD
                        _instance = new SystemDrawingImageProcessor();
#else
                        _instance = new ImageSharpImageProcessor();
#endif
                    }
                }
            }
            return _instance;
        }
    }

    /// <summary>
    /// 커스텀 이미지 처리기 설정
    /// </summary>
    /// <param name="processor">사용할 이미지 처리기</param>
    public static void SetInstance(IImageProcessor processor)
    {
        lock (_lock)
        {
            _instance = processor ?? throw new ArgumentNullException(nameof(processor));
        }
    }

    /// <summary>
    /// 이미지를 ESC/POS 래스터 데이터로 변환
    /// </summary>
    /// <param name="imagePath">이미지 파일 경로</param>
    /// <param name="maxWidth">최대 폭 (픽셀)</param>
    /// <param name="threshold">흑백 변환 임계값 (0-255)</param>
    /// <param name="useDithering">Floyd-Steinberg 디더링 사용 여부</param>
    /// <returns>래스터 이미지 데이터</returns>
    public static RasterImageData ProcessImage(string imagePath, int maxWidth = DefaultPrinterWidth, byte threshold = 127, bool useDithering = false)
        => Instance.ProcessImage(imagePath, maxWidth, threshold, useDithering);

    /// <summary>
    /// 이미지를 ESC/POS 래스터 데이터로 변환
    /// </summary>
    /// <param name="imageData">이미지 바이트 배열</param>
    /// <param name="maxWidth">최대 폭 (픽셀)</param>
    /// <param name="threshold">흑백 변환 임계값 (0-255)</param>
    /// <param name="useDithering">Floyd-Steinberg 디더링 사용 여부</param>
    /// <returns>래스터 이미지 데이터</returns>
    public static RasterImageData ProcessImage(byte[] imageData, int maxWidth = DefaultPrinterWidth, byte threshold = 127, bool useDithering = false)
        => Instance.ProcessImage(imageData, maxWidth, threshold, useDithering);

    /// <summary>
    /// 이미지를 ESC/POS 래스터 데이터로 변환
    /// </summary>
    /// <param name="imageStream">이미지 스트림</param>
    /// <param name="maxWidth">최대 폭 (픽셀)</param>
    /// <param name="threshold">흑백 변환 임계값 (0-255)</param>
    /// <param name="useDithering">Floyd-Steinberg 디더링 사용 여부</param>
    /// <returns>래스터 이미지 데이터</returns>
    public static RasterImageData ProcessImage(Stream imageStream, int maxWidth = DefaultPrinterWidth, byte threshold = 127, bool useDithering = false)
        => Instance.ProcessImage(imageStream, maxWidth, threshold, useDithering);

    /// <summary>
    /// 래스터 이미지를 GS v 0 명령으로 변환
    /// </summary>
    /// <param name="rasterData">래스터 이미지 데이터</param>
    /// <param name="density">이미지 밀도</param>
    /// <returns>ESC/POS 명령 바이트 배열</returns>
    public static byte[] ToEscPosCommand(RasterImageData rasterData, ImageDensity density = ImageDensity.Normal)
    {
        var mode = density switch
        {
            ImageDensity.Normal => (byte)0,
            ImageDensity.DoubleWidth => (byte)1,
            ImageDensity.DoubleHeight => (byte)2,
            ImageDensity.Double => (byte)3,
            _ => (byte)0
        };

        return Commands.EscPosCommands.RasterImage.PrintRaster(
            mode,
            rasterData.WidthBytes,
            rasterData.Height,
            rasterData.Data);
    }
}

/// <summary>
/// ESC/POS 래스터 이미지 데이터
/// </summary>
/// <param name="WidthBytes">폭 (바이트 단위, 8픽셀당 1바이트)</param>
/// <param name="Height">높이 (픽셀)</param>
/// <param name="Data">래스터 데이터</param>
public record RasterImageData(int WidthBytes, int Height, byte[] Data)
{
    /// <summary>
    /// 폭 (픽셀 단위)
    /// </summary>
    public int WidthPixels => WidthBytes * 8;
}
