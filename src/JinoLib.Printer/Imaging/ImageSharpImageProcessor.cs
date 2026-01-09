#if !WINDOWS_BUILD
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace JinoLib.Printer.Imaging;

/// <summary>
/// ImageSharp 기반 이미지 처리기 (크로스플랫폼)
/// </summary>
public class ImageSharpImageProcessor : IImageProcessor
{
    /// <summary>
    /// 기본 프린터 폭 (픽셀) - 80mm 프린터 기준 576 dots
    /// </summary>
    public const int DefaultPrinterWidth = 576;

    /// <inheritdoc/>
    public RasterImageData ProcessImage(string imagePath, int maxWidth = DefaultPrinterWidth, byte threshold = 127, bool useDithering = false)
    {
        using var image = Image.Load<Rgba32>(imagePath);
        return ProcessImageInternal(image, maxWidth, threshold, useDithering);
    }

    /// <inheritdoc/>
    public RasterImageData ProcessImage(byte[] imageData, int maxWidth = DefaultPrinterWidth, byte threshold = 127, bool useDithering = false)
    {
        using var image = Image.Load<Rgba32>(imageData);
        return ProcessImageInternal(image, maxWidth, threshold, useDithering);
    }

    /// <inheritdoc/>
    public RasterImageData ProcessImage(Stream imageStream, int maxWidth = DefaultPrinterWidth, byte threshold = 127, bool useDithering = false)
    {
        using var image = Image.Load<Rgba32>(imageStream);
        return ProcessImageInternal(image, maxWidth, threshold, useDithering);
    }

    private static RasterImageData ProcessImageInternal(Image<Rgba32> image, int maxWidth, byte threshold, bool useDithering)
    {
        // 리사이즈
        var width = Math.Min(image.Width, maxWidth);
        var height = (int)(image.Height * ((double)width / image.Width));

        // 8의 배수로 맞추기 (래스터 이미지 요구사항)
        width = (width + 7) / 8 * 8;

        image.Mutate(ctx => ctx
            .Resize(width, height)
            .Grayscale());

        if (useDithering)
        {
            ApplyFloydSteinbergDithering(image, threshold);
        }

        return ConvertToRaster(image, threshold);
    }

    /// <summary>
    /// Floyd-Steinberg 디더링 적용
    /// </summary>
    private static void ApplyFloydSteinbergDithering(Image<Rgba32> image, byte threshold)
    {
        var width = image.Width;
        var height = image.Height;

        // 오차 버퍼 (현재 행과 다음 행)
        var errorBuffer = new float[2, width + 2];
        var currentRow = 0;

        image.ProcessPixelRows(accessor =>
        {
            for (var y = 0; y < height; y++)
            {
                var pixelRow = accessor.GetRowSpan(y);
                var nextRow = y < height - 1 ? currentRow ^ 1 : currentRow;

                // 다음 행 버퍼 초기화
                for (var i = 0; i < width + 2; i++)
                {
                    errorBuffer[nextRow, i] = 0;
                }

                for (var x = 0; x < width; x++)
                {
                    var pixel = pixelRow[x];
                    // 이미 그레이스케일이므로 R 채널만 사용
                    var gray = pixel.R;
                    var oldPixel = gray + errorBuffer[currentRow, x + 1];
                    var newPixel = oldPixel < threshold ? 0 : 255;

                    // 새 픽셀값 설정
                    pixelRow[x] = new Rgba32((byte)newPixel, (byte)newPixel, (byte)newPixel, 255);

                    // 양자화 오차 계산
                    var error = oldPixel - newPixel;

                    // Floyd-Steinberg 오차 확산
                    if (x < width - 1)
                    {
                        errorBuffer[currentRow, x + 2] += error * 7 / 16f;
                    }

                    if (y < height - 1)
                    {
                        if (x > 0)
                        {
                            errorBuffer[nextRow, x] += error * 3 / 16f;
                        }
                        errorBuffer[nextRow, x + 1] += error * 5 / 16f;
                        if (x < width - 1)
                        {
                            errorBuffer[nextRow, x + 2] += error * 1 / 16f;
                        }
                    }
                }

                currentRow = nextRow;
            }
        });
    }

    /// <summary>
    /// 이미지를 ESC/POS 래스터 데이터로 변환
    /// </summary>
    private static RasterImageData ConvertToRaster(Image<Rgba32> image, byte threshold)
    {
        var width = image.Width;
        var height = image.Height;
        var widthBytes = width / 8;
        var data = new byte[widthBytes * height];

        image.ProcessPixelRows(accessor =>
        {
            for (var y = 0; y < height; y++)
            {
                var pixelRow = accessor.GetRowSpan(y);

                for (var x = 0; x < width; x++)
                {
                    var gray = pixelRow[x].R; // 이미 그레이스케일

                    // 검은색 = 1, 흰색 = 0 (ESC/POS 규격)
                    if (gray < threshold)
                    {
                        var byteIndex = (y * widthBytes) + (x / 8);
                        var bitIndex = 7 - (x % 8);
                        data[byteIndex] |= (byte)(1 << bitIndex);
                    }
                }
            }
        });

        return new RasterImageData(widthBytes, height, data);
    }
}
#endif
