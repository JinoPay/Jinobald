using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using JinoLib.Printer.Commands.Enums;

namespace JinoLib.Printer.Imaging;

/// <summary>
/// ESC/POS 프린터용 이미지 처리기 (System.Drawing 기반)
/// </summary>
public static class ImageProcessor
{
    /// <summary>
    /// 기본 프린터 폭 (픽셀) - 80mm 프린터 기준 576 dots
    /// </summary>
    public const int DefaultPrinterWidth = 576;

    /// <summary>
    /// 이미지를 ESC/POS 래스터 데이터로 변환
    /// </summary>
    /// <param name="imagePath">이미지 파일 경로</param>
    /// <param name="maxWidth">최대 폭 (픽셀)</param>
    /// <param name="threshold">흑백 변환 임계값 (0-255)</param>
    /// <param name="useDithering">Floyd-Steinberg 디더링 사용 여부</param>
    /// <returns>래스터 이미지 데이터</returns>
    public static RasterImageData ProcessImage(string imagePath, int maxWidth = DefaultPrinterWidth, byte threshold = 127, bool useDithering = false)
    {
        using var image = Image.FromFile(imagePath);
        return ProcessImage(image, maxWidth, threshold, useDithering);
    }

    /// <summary>
    /// 이미지를 ESC/POS 래스터 데이터로 변환
    /// </summary>
    public static RasterImageData ProcessImage(Image image, int maxWidth = DefaultPrinterWidth, byte threshold = 127, bool useDithering = false)
    {
        using var bitmap = ResizeAndConvertToGrayscale(image, maxWidth);

        if (useDithering)
        {
            DitherAlgorithm.FloydSteinberg(bitmap);
        }

        return ConvertToRaster(bitmap, threshold);
    }

    /// <summary>
    /// 이미지를 ESC/POS 래스터 데이터로 변환 (바이트 배열 입력)
    /// </summary>
    public static RasterImageData ProcessImage(byte[] imageData, int maxWidth = DefaultPrinterWidth, byte threshold = 127, bool useDithering = false)
    {
        using var stream = new MemoryStream(imageData);
        using var image = Image.FromStream(stream);
        return ProcessImage(image, maxWidth, threshold, useDithering);
    }

    /// <summary>
    /// 이미지 리사이즈 및 그레이스케일 변환
    /// </summary>
    private static Bitmap ResizeAndConvertToGrayscale(Image image, int maxWidth)
    {
        var width = Math.Min(image.Width, maxWidth);
        var height = (int)(image.Height * ((double)width / image.Width));

        // 8의 배수로 맞추기 (래스터 이미지 요구사항)
        width = (width + 7) / 8 * 8;

        var resized = new Bitmap(width, height, PixelFormat.Format24bppRgb);

        using (var graphics = Graphics.FromImage(resized))
        {
            graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            graphics.SmoothingMode = SmoothingMode.HighQuality;
            graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
            graphics.CompositingQuality = CompositingQuality.HighQuality;

            // 그레이스케일 변환 매트릭스
            var colorMatrix = new ColorMatrix(
            [
                [0.299f, 0.299f, 0.299f, 0, 0],
                [0.587f, 0.587f, 0.587f, 0, 0],
                [0.114f, 0.114f, 0.114f, 0, 0],
                [0, 0, 0, 1, 0],
                [0, 0, 0, 0, 1]
            ]);

            using var imageAttributes = new ImageAttributes();
            imageAttributes.SetColorMatrix(colorMatrix);

            graphics.DrawImage(
                image,
                new Rectangle(0, 0, width, height),
                0, 0, image.Width, image.Height,
                GraphicsUnit.Pixel,
                imageAttributes);
        }

        return resized;
    }

    /// <summary>
    /// 비트맵을 ESC/POS 래스터 데이터로 변환
    /// </summary>
    private static RasterImageData ConvertToRaster(Bitmap bitmap, byte threshold)
    {
        var width = bitmap.Width;
        var height = bitmap.Height;
        var widthBytes = width / 8;

        var data = new byte[widthBytes * height];

        var bitmapData = bitmap.LockBits(
            new Rectangle(0, 0, width, height),
            ImageLockMode.ReadOnly,
            PixelFormat.Format24bppRgb);

        try
        {
            unsafe
            {
                var scan0 = (byte*)bitmapData.Scan0;
                var stride = bitmapData.Stride;

                for (var y = 0; y < height; y++)
                {
                    var row = scan0 + (y * stride);

                    for (var x = 0; x < width; x++)
                    {
                        var pixelOffset = x * 3;
                        var gray = row[pixelOffset]; // 이미 그레이스케일이므로 R 채널만 사용

                        // 검은색 = 1, 흰색 = 0 (ESC/POS 규격)
                        if (gray < threshold)
                        {
                            var byteIndex = (y * widthBytes) + (x / 8);
                            var bitIndex = 7 - (x % 8);
                            data[byteIndex] |= (byte)(1 << bitIndex);
                        }
                    }
                }
            }
        }
        finally
        {
            bitmap.UnlockBits(bitmapData);
        }

        return new RasterImageData(widthBytes, height, data);
    }

    /// <summary>
    /// 래스터 이미지를 GS v 0 명령으로 변환
    /// </summary>
    public static byte[] ToEscPosCommand(RasterImageData rasterData, ImageDensity density = ImageDensity.Normal)
    {
        var mode = density switch
        {
            ImageDensity.Normal => (byte)0,
            ImageDensity.DoubleWidth => (byte)1,
            ImageDensity.DoubleHeight => (byte)2,
            ImageDensity.Quadruple => (byte)3,
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
