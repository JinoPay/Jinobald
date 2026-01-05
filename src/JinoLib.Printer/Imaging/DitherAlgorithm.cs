using System.Drawing;
using System.Drawing.Imaging;

namespace JinoLib.Printer.Imaging;

/// <summary>
/// 이미지 디더링 알고리즘
/// </summary>
public static class DitherAlgorithm
{
    /// <summary>
    /// Floyd-Steinberg 디더링 알고리즘
    /// 가장 널리 사용되는 오차 확산 디더링 방식
    /// </summary>
    /// <param name="bitmap">그레이스케일 비트맵 (24bpp)</param>
    public static void FloydSteinberg(Bitmap bitmap)
    {
        var width = bitmap.Width;
        var height = bitmap.Height;

        var bitmapData = bitmap.LockBits(
            new Rectangle(0, 0, width, height),
            ImageLockMode.ReadWrite,
            PixelFormat.Format24bppRgb);

        try
        {
            // 오차 버퍼 (현재 행과 다음 행)
            var errorBuffer = new float[2, width + 2];
            var currentRow = 0;

            unsafe
            {
                var scan0 = (byte*)bitmapData.Scan0;
                var stride = bitmapData.Stride;

                for (var y = 0; y < height; y++)
                {
                    var row = scan0 + (y * stride);
                    var nextRow = y < height - 1 ? currentRow ^ 1 : currentRow;

                    // 다음 행 버퍼 초기화
                    for (var i = 0; i < width + 2; i++)
                    {
                        errorBuffer[nextRow, i] = 0;
                    }

                    for (var x = 0; x < width; x++)
                    {
                        var pixelOffset = x * 3;
                        var oldPixel = row[pixelOffset] + errorBuffer[currentRow, x + 1];

                        // 임계값 적용 (127.5 = 중간값)
                        var newPixel = oldPixel < 127.5f ? 0 : 255;

                        // 새 픽셀값 설정 (RGB 모두 동일하게)
                        row[pixelOffset] = (byte)newPixel;
                        row[pixelOffset + 1] = (byte)newPixel;
                        row[pixelOffset + 2] = (byte)newPixel;

                        // 양자화 오차 계산
                        var error = oldPixel - newPixel;

                        // Floyd-Steinberg 오차 확산
                        //      *   7/16
                        // 3/16 5/16 1/16
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
            }
        }
        finally
        {
            bitmap.UnlockBits(bitmapData);
        }
    }

    /// <summary>
    /// Atkinson 디더링 알고리즘
    /// 매킨토시에서 사용된 디더링 방식 (더 가벼운 결과)
    /// </summary>
    /// <param name="bitmap">그레이스케일 비트맵 (24bpp)</param>
    public static void Atkinson(Bitmap bitmap)
    {
        var width = bitmap.Width;
        var height = bitmap.Height;

        var bitmapData = bitmap.LockBits(
            new Rectangle(0, 0, width, height),
            ImageLockMode.ReadWrite,
            PixelFormat.Format24bppRgb);

        try
        {
            // 오차 버퍼 (3행 필요)
            var errorBuffer = new float[3, width + 4];
            var currentRow = 0;

            unsafe
            {
                var scan0 = (byte*)bitmapData.Scan0;
                var stride = bitmapData.Stride;

                for (var y = 0; y < height; y++)
                {
                    var row = scan0 + (y * stride);

                    // 3행 이후 버퍼 순환
                    if (y > 0)
                    {
                        var clearRow = (currentRow + 2) % 3;
                        for (var i = 0; i < width + 4; i++)
                        {
                            errorBuffer[clearRow, i] = 0;
                        }
                    }

                    for (var x = 0; x < width; x++)
                    {
                        var pixelOffset = x * 3;
                        var oldPixel = row[pixelOffset] + errorBuffer[currentRow, x + 2];

                        var newPixel = oldPixel < 127.5f ? 0 : 255;

                        row[pixelOffset] = (byte)newPixel;
                        row[pixelOffset + 1] = (byte)newPixel;
                        row[pixelOffset + 2] = (byte)newPixel;

                        // Atkinson: 오차의 1/8만 확산 (총 6개 픽셀에 분배, 나머지는 버림)
                        var error = (oldPixel - newPixel) / 8f;

                        // Atkinson 오차 확산 패턴
                        //       *   1   1
                        //   1   1   1
                        //       1
                        var row0 = currentRow;
                        var row1 = (currentRow + 1) % 3;
                        var row2 = (currentRow + 2) % 3;

                        if (x < width - 1)
                        {
                            errorBuffer[row0, x + 3] += error;
                        }
                        if (x < width - 2)
                        {
                            errorBuffer[row0, x + 4] += error;
                        }

                        if (y < height - 1)
                        {
                            if (x > 0)
                            {
                                errorBuffer[row1, x + 1] += error;
                            }
                            errorBuffer[row1, x + 2] += error;
                            if (x < width - 1)
                            {
                                errorBuffer[row1, x + 3] += error;
                            }
                        }

                        if (y < height - 2)
                        {
                            errorBuffer[row2, x + 2] += error;
                        }
                    }

                    currentRow = (currentRow + 1) % 3;
                }
            }
        }
        finally
        {
            bitmap.UnlockBits(bitmapData);
        }
    }
}
