namespace JinoLib.Printer.Commands;

/// <summary>
/// ESC/POS 원시 명령 바이트 상수
/// </summary>
public static class EscPosCommands
{
    #region 제어 문자

    public static ReadOnlySpan<byte> NUL => [0x00];
    public static ReadOnlySpan<byte> LF => [0x0A];
    public static ReadOnlySpan<byte> CR => [0x0D];
    public static ReadOnlySpan<byte> HT => [0x09];
    public static ReadOnlySpan<byte> FF => [0x0C];
    public static ReadOnlySpan<byte> ESC => [0x1B];
    public static ReadOnlySpan<byte> FS => [0x1C];
    public static ReadOnlySpan<byte> GS => [0x1D];
    public static ReadOnlySpan<byte> DLE => [0x10];

    #endregion

    #region 프린터 초기화

    public static ReadOnlySpan<byte> Initialize => [0x1B, 0x40];

    #endregion

    #region 텍스트 포맷팅

    public static ReadOnlySpan<byte> BoldOn => [0x1B, 0x45, 0x01];
    public static ReadOnlySpan<byte> BoldOff => [0x1B, 0x45, 0x00];
    public static ReadOnlySpan<byte> UnderlineOff => [0x1B, 0x2D, 0x00];
    public static ReadOnlySpan<byte> UnderlineSingle => [0x1B, 0x2D, 0x01];
    public static ReadOnlySpan<byte> UnderlineDouble => [0x1B, 0x2D, 0x02];
    public static ReadOnlySpan<byte> ReverseOn => [0x1D, 0x42, 0x01];
    public static ReadOnlySpan<byte> ReverseOff => [0x1D, 0x42, 0x00];

    #endregion

    #region 정렬

    public static ReadOnlySpan<byte> AlignLeft => [0x1B, 0x61, 0x00];
    public static ReadOnlySpan<byte> AlignCenter => [0x1B, 0x61, 0x01];
    public static ReadOnlySpan<byte> AlignRight => [0x1B, 0x61, 0x02];

    #endregion

    #region 글꼴 크기

    public static byte[] CharacterSize(int width, int height) =>
        [0x1D, 0x21, (byte)((width << 4) | height)];

    #endregion

    #region 용지 제어

    public static ReadOnlySpan<byte> CutFull => [0x1D, 0x56, 0x00];
    public static ReadOnlySpan<byte> CutPartial => [0x1D, 0x56, 0x01];
    public static byte[] CutFeedAndCut(byte lines) => [0x1D, 0x56, 0x42, lines];
    public static byte[] FeedLines(byte lines) => [0x1B, 0x64, lines];
    public static byte[] FeedDots(byte dots) => [0x1B, 0x4A, dots];

    #endregion

    #region 캐시드로워

    public static byte[] OpenCashDrawer(byte pin, byte onTime, byte offTime) =>
        [0x1B, 0x70, pin, onTime, offTime];

    public static byte[] OpenCashDrawer(byte pin) => OpenCashDrawer(pin, 25, 250);

    #endregion

    #region 비프음

    public static byte[] Beep(byte count, byte duration) => [0x1B, 0x42, count, duration];

    #endregion

    #region 코드페이지

    public static byte[] SelectCodePage(byte codePage) => [0x1B, 0x74, codePage];
    public static ReadOnlySpan<byte> KoreanModeOn => [0x1C, 0x26];
    public static ReadOnlySpan<byte> KoreanModeOff => [0x1C, 0x2E];
    public static byte[] SelectInternationalCharacterSet(byte characterSet) => [0x1B, 0x52, characterSet];

    #endregion

    #region 바코드

    public static class Barcode
    {
        public static byte[] SetHeight(byte height) => [0x1D, 0x68, height];
        public static byte[] SetWidth(byte width) => [0x1D, 0x77, width];
        public static byte[] SetHriPosition(byte position) => [0x1D, 0x48, position];
        public static byte[] SetHriFont(byte font) => [0x1D, 0x66, font];

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
            [0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, model, 0x00];

        public static byte[] SetModuleSize(byte size) =>
            [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size];

        public static byte[] SetErrorCorrection(byte level) =>
            [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, level];

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

        public static ReadOnlySpan<byte> Print => [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30];
    }

    #endregion

    #region PDF417

    public static class Pdf417
    {
        public static byte[] SetColumns(byte columns) => [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x30, 0x41, columns];
        public static byte[] SetRows(byte rows) => [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x30, 0x42, rows];
        public static byte[] SetModuleWidth(byte width) => [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x30, 0x43, width];
        public static byte[] SetRowHeight(byte height) => [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x30, 0x44, height];
        public static byte[] SetErrorCorrection(byte level) => [0x1D, 0x28, 0x6B, 0x04, 0x00, 0x30, 0x45, 0x30, level];

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

        public static ReadOnlySpan<byte> Print => [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x30, 0x51, 0x30];
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
        public static ReadOnlySpan<byte> TransmitPrinterStatus => [0x10, 0x04, 0x01];
        public static ReadOnlySpan<byte> TransmitOfflineStatus => [0x10, 0x04, 0x02];
        public static ReadOnlySpan<byte> TransmitErrorStatus => [0x10, 0x04, 0x03];
        public static ReadOnlySpan<byte> TransmitPaperStatus => [0x10, 0x04, 0x04];
    }

    #endregion
}
