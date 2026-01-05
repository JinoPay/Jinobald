using JinoLib.Printer.Commands;
using Xunit;

namespace JinoLib.Printer.Tests.Commands;

/// <summary>
/// EscPosCommands 단위 테스트
/// </summary>
public class EscPosCommandsTests
{
    #region 제어 문자

    [Fact]
    public void LF_Should_Return_Correct_Byte()
    {
        Assert.Equal([0x0A], EscPosCommands.LF.ToArray());
    }

    [Fact]
    public void ESC_Should_Return_Correct_Byte()
    {
        Assert.Equal([0x1B], EscPosCommands.ESC.ToArray());
    }

    [Fact]
    public void GS_Should_Return_Correct_Byte()
    {
        Assert.Equal([0x1D], EscPosCommands.GS.ToArray());
    }

    [Fact]
    public void FS_Should_Return_Correct_Byte()
    {
        Assert.Equal([0x1C], EscPosCommands.FS.ToArray());
    }

    #endregion

    #region 프린터 초기화

    [Fact]
    public void Initialize_Should_Return_ESC_At()
    {
        Assert.Equal([0x1B, 0x40], EscPosCommands.Initialize.ToArray());
    }

    #endregion

    #region 텍스트 포맷팅

    [Fact]
    public void BoldOn_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x1B, 0x45, 0x01], EscPosCommands.BoldOn.ToArray());
    }

    [Fact]
    public void BoldOff_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x1B, 0x45, 0x00], EscPosCommands.BoldOff.ToArray());
    }

    [Fact]
    public void UnderlineSingle_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x1B, 0x2D, 0x01], EscPosCommands.UnderlineSingle.ToArray());
    }

    [Fact]
    public void UnderlineDouble_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x1B, 0x2D, 0x02], EscPosCommands.UnderlineDouble.ToArray());
    }

    [Fact]
    public void UnderlineOff_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x1B, 0x2D, 0x00], EscPosCommands.UnderlineOff.ToArray());
    }

    [Fact]
    public void ReverseOn_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x1D, 0x42, 0x01], EscPosCommands.ReverseOn.ToArray());
    }

    [Fact]
    public void ReverseOff_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x1D, 0x42, 0x00], EscPosCommands.ReverseOff.ToArray());
    }

    #endregion

    #region 정렬

    [Fact]
    public void AlignLeft_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x1B, 0x61, 0x00], EscPosCommands.AlignLeft.ToArray());
    }

    [Fact]
    public void AlignCenter_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x1B, 0x61, 0x01], EscPosCommands.AlignCenter.ToArray());
    }

    [Fact]
    public void AlignRight_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x1B, 0x61, 0x02], EscPosCommands.AlignRight.ToArray());
    }

    #endregion

    #region 글꼴 크기

    [Fact]
    public void CharacterSize_Normal_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.CharacterSize(0, 0);
        Assert.Equal([0x1D, 0x21, 0x00], result);
    }

    [Fact]
    public void CharacterSize_Double_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.CharacterSize(1, 1);
        Assert.Equal([0x1D, 0x21, 0x11], result);
    }

    [Fact]
    public void CharacterSize_DoubleWidth_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.CharacterSize(1, 0);
        Assert.Equal([0x1D, 0x21, 0x10], result);
    }

    [Fact]
    public void CharacterSize_DoubleHeight_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.CharacterSize(0, 1);
        Assert.Equal([0x1D, 0x21, 0x01], result);
    }

    #endregion

    #region 용지 제어

    [Fact]
    public void CutFull_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x1D, 0x56, 0x00], EscPosCommands.CutFull.ToArray());
    }

    [Fact]
    public void CutPartial_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x1D, 0x56, 0x01], EscPosCommands.CutPartial.ToArray());
    }

    [Fact]
    public void FeedLines_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.FeedLines(5);
        Assert.Equal([0x1B, 0x64, 0x05], result);
    }

    [Fact]
    public void FeedDots_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.FeedDots(100);
        Assert.Equal([0x1B, 0x4A, 0x64], result);
    }

    [Fact]
    public void CutFeedAndCut_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.CutFeedAndCut(3);
        Assert.Equal([0x1D, 0x56, 0x42, 0x03], result);
    }

    #endregion

    #region 캐시드로워

    [Fact]
    public void OpenCashDrawer_Default_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.OpenCashDrawer(0);
        Assert.Equal([0x1B, 0x70, 0x00, 0x19, 0xFA], result);
    }

    [Fact]
    public void OpenCashDrawer_Pin5_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.OpenCashDrawer(1);
        Assert.Equal([0x1B, 0x70, 0x01, 0x19, 0xFA], result);
    }

    [Fact]
    public void OpenCashDrawer_Custom_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.OpenCashDrawer(0, 50, 200);
        Assert.Equal([0x1B, 0x70, 0x00, 0x32, 0xC8], result);
    }

    #endregion

    #region 비프음

    [Fact]
    public void Beep_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.Beep(3, 5);
        Assert.Equal([0x1B, 0x42, 0x03, 0x05], result);
    }

    #endregion

    #region 코드페이지

    [Fact]
    public void SelectCodePage_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.SelectCodePage(21);
        Assert.Equal([0x1B, 0x74, 0x15], result);
    }

    [Fact]
    public void KoreanModeOn_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x1C, 0x26], EscPosCommands.KoreanModeOn.ToArray());
    }

    [Fact]
    public void KoreanModeOff_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x1C, 0x2E], EscPosCommands.KoreanModeOff.ToArray());
    }

    #endregion

    #region 바코드

    [Fact]
    public void Barcode_SetHeight_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.Barcode.SetHeight(80);
        Assert.Equal([0x1D, 0x68, 0x50], result);
    }

    [Fact]
    public void Barcode_SetWidth_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.Barcode.SetWidth(3);
        Assert.Equal([0x1D, 0x77, 0x03], result);
    }

    [Fact]
    public void Barcode_SetHriPosition_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.Barcode.SetHriPosition(2);
        Assert.Equal([0x1D, 0x48, 0x02], result);
    }

    [Fact]
    public void Barcode_Print_Should_Return_Correct_Sequence()
    {
        var data = "12345"u8.ToArray();
        var result = EscPosCommands.Barcode.Print(73, data); // Code128 = 73

        Assert.Equal(0x1D, result[0]);
        Assert.Equal(0x6B, result[1]);
        Assert.Equal(73, result[2]);
        Assert.Equal(5, result[3]); // data length
        Assert.Equal(data, result[4..]);
    }

    #endregion

    #region QR코드

    [Fact]
    public void QrCode_SetModel_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.QrCode.SetModel(50); // Model2
        Assert.Equal([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00], result);
    }

    [Fact]
    public void QrCode_SetModuleSize_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.QrCode.SetModuleSize(4);
        Assert.Equal([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x04], result);
    }

    [Fact]
    public void QrCode_SetErrorCorrection_Should_Return_Correct_Sequence()
    {
        var result = EscPosCommands.QrCode.SetErrorCorrection(49); // M level
        Assert.Equal([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31], result);
    }

    [Fact]
    public void QrCode_Print_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30], EscPosCommands.QrCode.Print.ToArray());
    }

    [Fact]
    public void QrCode_StoreData_Should_Return_Correct_Sequence()
    {
        var data = "TEST"u8.ToArray();
        var result = EscPosCommands.QrCode.StoreData(data);

        Assert.Equal(0x1D, result[0]);
        Assert.Equal(0x28, result[1]);
        Assert.Equal(0x6B, result[2]);
        // pL = (4+3) % 256 = 7
        // pH = (4+3) / 256 = 0
        Assert.Equal(0x07, result[3]);
        Assert.Equal(0x00, result[4]);
        Assert.Equal(0x31, result[5]);
        Assert.Equal(0x50, result[6]);
        Assert.Equal(0x30, result[7]);
        Assert.Equal(data, result[8..]);
    }

    #endregion

    #region 상태 조회

    [Fact]
    public void TransmitPrinterStatus_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x10, 0x04, 0x01], EscPosCommands.Status.TransmitPrinterStatus.ToArray());
    }

    [Fact]
    public void TransmitOfflineStatus_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x10, 0x04, 0x02], EscPosCommands.Status.TransmitOfflineStatus.ToArray());
    }

    [Fact]
    public void TransmitErrorStatus_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x10, 0x04, 0x03], EscPosCommands.Status.TransmitErrorStatus.ToArray());
    }

    [Fact]
    public void TransmitPaperStatus_Should_Return_Correct_Sequence()
    {
        Assert.Equal([0x10, 0x04, 0x04], EscPosCommands.Status.TransmitPaperStatus.ToArray());
    }

    #endregion
}
