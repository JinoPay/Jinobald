namespace JinoLib.Printer.Commands;

/// <summary>
/// ESC/POS 원시 명령 바이트 상수
/// </summary>
public static class EscPosCommands
{
    #region 제어 문자

#if NET5_0_OR_GREATER
    public static ReadOnlySpan<byte> NUL => new byte[] { 0x00 };
    public static ReadOnlySpan<byte> LF => new byte[] { 0x0A };
    public static ReadOnlySpan<byte> CR => new byte[] { 0x0D };
    public static ReadOnlySpan<byte> HT => new byte[] { 0x09 };
    public static ReadOnlySpan<byte> FF => new byte[] { 0x0C };
    public static ReadOnlySpan<byte> ESC => new byte[] { 0x1B };
    public static ReadOnlySpan<byte> FS => new byte[] { 0x1C };
    public static ReadOnlySpan<byte> GS => new byte[] { 0x1D };
    public static ReadOnlySpan<byte> DLE => new byte[] { 0x10 };
#else
    public static byte[] NUL => new byte[] { 0x00 };
    public static byte[] LF => new byte[] { 0x0A };
    public static byte[] CR => new byte[] { 0x0D };
    public static byte[] HT => new byte[] { 0x09 };
    public static byte[] FF => new byte[] { 0x0C };
    public static byte[] ESC => new byte[] { 0x1B };
    public static byte[] FS => new byte[] { 0x1C };
    public static byte[] GS => new byte[] { 0x1D };
    public static byte[] DLE => new byte[] { 0x10 };
#endif

    #endregion

    #region 프린터 초기화

#if NET5_0_OR_GREATER
    public static ReadOnlySpan<byte> Initialize => new byte[] { 0x1B, 0x40 };
#else
    public static byte[] Initialize => new byte[] { 0x1B, 0x40 };
#endif

    #endregion

    #region 텍스트 포맷팅

#if NET5_0_OR_GREATER
    public static ReadOnlySpan<byte> BoldOn => new byte[] { 0x1B, 0x45, 0x01 };
    public static ReadOnlySpan<byte> BoldOff => new byte[] { 0x1B, 0x45, 0x00 };
    public static ReadOnlySpan<byte> UnderlineOff => new byte[] { 0x1B, 0x2D, 0x00 };
    public static ReadOnlySpan<byte> UnderlineSingle => new byte[] { 0x1B, 0x2D, 0x01 };
    public static ReadOnlySpan<byte> UnderlineDouble => new byte[] { 0x1B, 0x2D, 0x02 };
    public static ReadOnlySpan<byte> ReverseOn => new byte[] { 0x1D, 0x42, 0x01 };
    public static ReadOnlySpan<byte> ReverseOff => new byte[] { 0x1D, 0x42, 0x00 };
#else
    public static byte[] BoldOn => new byte[] { 0x1B, 0x45, 0x01 };
    public static byte[] BoldOff => new byte[] { 0x1B, 0x45, 0x00 };
    public static byte[] UnderlineOff => new byte[] { 0x1B, 0x2D, 0x00 };
    public static byte[] UnderlineSingle => new byte[] { 0x1B, 0x2D, 0x01 };
    public static byte[] UnderlineDouble => new byte[] { 0x1B, 0x2D, 0x02 };
    public static byte[] ReverseOn => new byte[] { 0x1D, 0x42, 0x01 };
    public static byte[] ReverseOff => new byte[] { 0x1D, 0x42, 0x00 };
#endif

    #endregion

    #region 정렬

#if NET5_0_OR_GREATER
    public static ReadOnlySpan<byte> AlignLeft => new byte[] { 0x1B, 0x61, 0x00 };
    public static ReadOnlySpan<byte> AlignCenter => new byte[] { 0x1B, 0x61, 0x01 };
    public static ReadOnlySpan<byte> AlignRight => new byte[] { 0x1B, 0x61, 0x02 };
#else
    public static byte[] AlignLeft => new byte[] { 0x1B, 0x61, 0x00 };
    public static byte[] AlignCenter => new byte[] { 0x1B, 0x61, 0x01 };
    public static byte[] AlignRight => new byte[] { 0x1B, 0x61, 0x02 };
#endif

    #endregion

    #region 글꼴 크기

    public static byte[] CharacterSize(int width, int height) =>
        new byte[] { 0x1D, 0x21, (byte)((width << 4) | height) };

    #endregion

    #region 용지 제어

#if NET5_0_OR_GREATER
    public static ReadOnlySpan<byte> CutFull => new byte[] { 0x1D, 0x56, 0x00 };
    public static ReadOnlySpan<byte> CutPartial => new byte[] { 0x1D, 0x56, 0x01 };
#else
    public static byte[] CutFull => new byte[] { 0x1D, 0x56, 0x00 };
    public static byte[] CutPartial => new byte[] { 0x1D, 0x56, 0x01 };
#endif

    public static byte[] CutFeedAndCut(byte lines) => new byte[] { 0x1D, 0x56, 0x42, lines };
    public static byte[] FeedLines(byte lines) => new byte[] { 0x1B, 0x64, lines };
    public static byte[] FeedDots(byte dots) => new byte[] { 0x1B, 0x4A, dots };

    #endregion

    #region 캐시드로워

    public static byte[] OpenCashDrawer(byte pin, byte onTime, byte offTime) =>
        new byte[] { 0x1B, 0x70, pin, onTime, offTime };

    public static byte[] OpenCashDrawer(byte pin) => OpenCashDrawer(pin, 25, 250);

    #endregion

    #region 비프음

    public static byte[] Beep(byte count, byte duration) => new byte[] { 0x1B, 0x42, count, duration };

    #endregion

    #region 코드페이지

    public static byte[] SelectCodePage(byte codePage) => new byte[] { 0x1B, 0x74, codePage };

#if NET5_0_OR_GREATER
    public static ReadOnlySpan<byte> KoreanModeOn => new byte[] { 0x1C, 0x26 };
    public static ReadOnlySpan<byte> KoreanModeOff => new byte[] { 0x1C, 0x2E };
#else
    public static byte[] KoreanModeOn => new byte[] { 0x1C, 0x26 };
    public static byte[] KoreanModeOff => new byte[] { 0x1C, 0x2E };
#endif

    public static byte[] SelectInternationalCharacterSet(byte characterSet) => new byte[] { 0x1B, 0x52, characterSet };

    #endregion

    #region 바코드

    public static class Barcode
    {
        public static byte[] SetHeight(byte height) => new byte[] { 0x1D, 0x68, height };
        public static byte[] SetWidth(byte width) => new byte[] { 0x1D, 0x77, width };
        public static byte[] SetHriPosition(byte position) => new byte[] { 0x1D, 0x48, position };
        public static byte[] SetHriFont(byte font) => new byte[] { 0x1D, 0x66, font };

        public static byte[] Print(byte type, byte[] data)
        {
            var result = new byte[4 + data.Length];
            result[0] = 0x1D;
            result[1] = 0x6B;
            result[2] = type;
            result[3] = (byte)data.Length;
            Array.Copy(data, 0, result, 4, data.Length);
            return result;
        }
    }

    #endregion

    #region QR코드

    public static class QrCode
    {
        public static byte[] SetModel(byte model) =>
            new byte[] { 0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, model, 0x00 };

        public static byte[] SetModuleSize(byte size) =>
            new byte[] { 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size };

        public static byte[] SetErrorCorrection(byte level) =>
            new byte[] { 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, level };

        public static byte[] StoreData(byte[] data)
        {
            var pL = (data.Length + 3) % 256;
            var pH = (data.Length + 3) / 256;
            var result = new byte[8 + data.Length];
            result[0] = 0x1D;
            result[1] = 0x28;
            result[2] = 0x6B;
            result[3] = (byte)pL;
            result[4] = (byte)pH;
            result[5] = 0x31;
            result[6] = 0x50;
            result[7] = 0x30;
            Array.Copy(data, 0, result, 8, data.Length);
            return result;
        }

#if NET5_0_OR_GREATER
        public static ReadOnlySpan<byte> Print => new byte[] { 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30 };
#else
        public static byte[] Print => new byte[] { 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30 };
#endif
    }

    #endregion

    #region PDF417

    public static class Pdf417
    {
        public static byte[] SetColumns(byte columns) => new byte[] { 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x30, 0x41, columns };
        public static byte[] SetRows(byte rows) => new byte[] { 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x30, 0x42, rows };
        public static byte[] SetModuleWidth(byte width) => new byte[] { 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x30, 0x43, width };
        public static byte[] SetRowHeight(byte height) => new byte[] { 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x30, 0x44, height };
        public static byte[] SetErrorCorrection(byte level) => new byte[] { 0x1D, 0x28, 0x6B, 0x04, 0x00, 0x30, 0x45, 0x30, level };

        public static byte[] StoreData(byte[] data)
        {
            var pL = (data.Length + 3) % 256;
            var pH = (data.Length + 3) / 256;
            var result = new byte[8 + data.Length];
            result[0] = 0x1D;
            result[1] = 0x28;
            result[2] = 0x6B;
            result[3] = (byte)pL;
            result[4] = (byte)pH;
            result[5] = 0x30;
            result[6] = 0x50;
            result[7] = 0x30;
            Array.Copy(data, 0, result, 8, data.Length);
            return result;
        }

#if NET5_0_OR_GREATER
        public static ReadOnlySpan<byte> Print => new byte[] { 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x30, 0x51, 0x30 };
#else
        public static byte[] Print => new byte[] { 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x30, 0x51, 0x30 };
#endif
    }

    #endregion

    #region 래스터 이미지

    public static class RasterImage
    {
        public static byte[] PrintRaster(byte mode, int width, int height, byte[] data)
        {
            var xL = width % 256;
            var xH = width / 256;
            var yL = height % 256;
            var yH = height / 256;
            var result = new byte[8 + data.Length];
            result[0] = 0x1D;
            result[1] = 0x76;
            result[2] = 0x30;
            result[3] = mode;
            result[4] = (byte)xL;
            result[5] = (byte)xH;
            result[6] = (byte)yL;
            result[7] = (byte)yH;
            Array.Copy(data, 0, result, 8, data.Length);
            return result;
        }
    }

    #endregion

    #region 상태 조회

    public static class Status
    {
#if NET5_0_OR_GREATER
        public static ReadOnlySpan<byte> TransmitPrinterStatus => new byte[] { 0x10, 0x04, 0x01 };
        public static ReadOnlySpan<byte> TransmitOfflineStatus => new byte[] { 0x10, 0x04, 0x02 };
        public static ReadOnlySpan<byte> TransmitErrorStatus => new byte[] { 0x10, 0x04, 0x03 };
        public static ReadOnlySpan<byte> TransmitPaperStatus => new byte[] { 0x10, 0x04, 0x04 };
#else
        public static byte[] TransmitPrinterStatus => new byte[] { 0x10, 0x04, 0x01 };
        public static byte[] TransmitOfflineStatus => new byte[] { 0x10, 0x04, 0x02 };
        public static byte[] TransmitErrorStatus => new byte[] { 0x10, 0x04, 0x03 };
        public static byte[] TransmitPaperStatus => new byte[] { 0x10, 0x04, 0x04 };
#endif
    }

    #endregion
}
