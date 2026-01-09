namespace JinoLib.Printer.Imaging;

/// <summary>
/// 이미지 처리 추상화 인터페이스
/// </summary>
public interface IImageProcessor
{
    /// <summary>
    /// 이미지 파일을 ESC/POS 래스터 데이터로 변환
    /// </summary>
    /// <param name="imagePath">이미지 파일 경로</param>
    /// <param name="maxWidth">최대 폭 (픽셀)</param>
    /// <param name="threshold">흑백 변환 임계값 (0-255)</param>
    /// <param name="useDithering">Floyd-Steinberg 디더링 사용 여부</param>
    /// <returns>래스터 이미지 데이터</returns>
    RasterImageData ProcessImage(string imagePath, int maxWidth = 576, byte threshold = 127, bool useDithering = false);

    /// <summary>
    /// 이미지 바이트 배열을 ESC/POS 래스터 데이터로 변환
    /// </summary>
    /// <param name="imageData">이미지 바이트 배열</param>
    /// <param name="maxWidth">최대 폭 (픽셀)</param>
    /// <param name="threshold">흑백 변환 임계값 (0-255)</param>
    /// <param name="useDithering">Floyd-Steinberg 디더링 사용 여부</param>
    /// <returns>래스터 이미지 데이터</returns>
    RasterImageData ProcessImage(byte[] imageData, int maxWidth = 576, byte threshold = 127, bool useDithering = false);

    /// <summary>
    /// 이미지 스트림을 ESC/POS 래스터 데이터로 변환
    /// </summary>
    /// <param name="imageStream">이미지 스트림</param>
    /// <param name="maxWidth">최대 폭 (픽셀)</param>
    /// <param name="threshold">흑백 변환 임계값 (0-255)</param>
    /// <param name="useDithering">Floyd-Steinberg 디더링 사용 여부</param>
    /// <returns>래스터 이미지 데이터</returns>
    RasterImageData ProcessImage(Stream imageStream, int maxWidth = 576, byte threshold = 127, bool useDithering = false);
}
