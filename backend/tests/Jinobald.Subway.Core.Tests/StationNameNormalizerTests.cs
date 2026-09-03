using Jinobald.Subway.Core.Names;

namespace Jinobald.Subway.Core.Tests;

/// <summary>
/// 앱의 normalizeStationKey 와 같은 픽스처. scripts/verify-routes.mjs 의 expectedNormalize 와 맞춰 둡니다.
/// </summary>
public sealed class StationNameNormalizerTests
{
    [Theory]
    [InlineData("총신대입구(이수)", "총신대입구")]
    [InlineData("서울역", "서울")]
    [InlineData("서울", "서울")]
    [InlineData(" 동대문역사문화공원 ", "동대문역사문화공원")]
    [InlineData("4·19민주묘지", "4·19민주묘지")]
    [InlineData("신촌(지하)", "신촌")]
    [InlineData("남한산성입구(성남법원·검찰청)", "남한산성입구")]
    [InlineData("이수 역", "이수")]
    [InlineData("역", "")]
    public void Normalize_matches_app_rule(string input, string expected)
    {
        Assert.Equal(expected, StationNameNormalizer.Normalize(input));
    }
}
