using System.Text;
using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Ingestion;

namespace Jinobald.Subway.Core.Tests;

public sealed class ParserTests
{
    private static Stream Utf8(string text) => new MemoryStream(Encoding.UTF8.GetBytes(text));

    [Fact]
    public async Task TransferGuideParser_parses_doors_and_bounds()
    {
        const string csv = "\"고유번호\",\"환승시작역\",\"환승시작 코드\",\"환승시작 호선\",\"하차 열차 방면\",\"하차위치(호차)\",\"하차위치(문)\",\"환승종료역\",\"환승 열차 방면\",\"환승 승차위치(호차)\",\"환승 승차위치(문)\",\"소요시간\"\n" +
                           "1,서울역,\"0150\",\"1\",시청 방면,\"10\",\"4\",\"0427\",숙대입구 방면,\"1\",\"1\",\"03:34\"\n" +
                           "145,성수,\"0211\",\"2\",뚝섬 방면,\"All\",\"All\",\"0244\",용답 방면,\"All\",\"All\",\"00:05\"\n";
        var outcome = await new TransferGuideParser().ParseAsync(Utf8(csv));

        Assert.Empty(outcome.Warnings);
        Assert.Equal(2, outcome.Rows.Count);
        var first = outcome.Rows[0];
        Assert.Equal("서울", first.NameKey);
        Assert.Equal("시청", first.FromDirectionStation);
        Assert.Equal(new DoorPosition(10, 4), first.Alight);
        Assert.Equal("10-4", first.Alight!.Label);
        Assert.Equal("숙대입구", first.ToDirectionStation);
        Assert.Equal(new DoorPosition(1, 1), first.Board);
        Assert.Equal(214, first.Seconds);
        Assert.Null(outcome.Rows[1].Alight);
        Assert.Null(outcome.Rows[1].Board);
        Assert.Equal(5, outcome.Rows[1].Seconds);
    }

    [Fact]
    public async Task TransferWalkTimeParser_parses_mmss()
    {
        const string csv = "연번,호선,환승역명,환승노선,환승거리,환승소요시간\n1,1,서울역,4호선,159,02:13\n2,1,서울역,공항철도,309,04:18\n";
        var outcome = await new TransferWalkTimeParser().ParseAsync(Utf8(csv));
        Assert.Equal(2, outcome.Rows.Count);
        Assert.Equal(133, outcome.Rows[0].Seconds);
        Assert.Equal("서울", outcome.Rows[0].NameKey);
        Assert.Equal("공항철도", outcome.Rows[1].ToLineName);
    }

    [Fact]
    public async Task SegmentTimeParser_pairs_consecutive_rows_per_line()
    {
        const string csv = "연번,호선,역명,소요시간,역간거리(km),호선별누계(km)\n1,1,서울역,00:00,0,0\n2,1,시청,02:00,1.1,1.1\n3,1,종각,02:00,1,2.1\n4,2,시청,00:00,0,0\n5,2,을지로입구,01:30,0.7,0.7\n";
        var outcome = await new SegmentTimeParser().ParseAsync(Utf8(csv));
        Assert.Equal(3, outcome.Rows.Count);
        Assert.Equal(("1", "서울", "시청", 120), (outcome.Rows[0].LineNo, outcome.Rows[0].FromNameKey, outcome.Rows[0].ToNameKey, outcome.Rows[0].Seconds));
        Assert.Equal(("2", "시청", "을지로입구", 90), (outcome.Rows[2].LineNo, outcome.Rows[2].FromNameKey, outcome.Rows[2].ToNameKey, outcome.Rows[2].Seconds));
    }

    [Fact]
    public async Task TimetableParser_handles_missing_arrival_and_after_midnight()
    {
        const string csv = "\"고유번호\",\"호선\",\"역사코드\",\"역사명\",\"주중주말\",\"방향\",\"급행여부\",\"열차코드\",\"열차도착시간\",\"열차출발시간\",\"출발역\",\"도착역\"\n" +
                           "452,\"1\",\"0150\",서울역,DAY,UP,\"0\",S902,,\"05:24:00\",서울역,의정부\n" +
                           "999,\"2\",\"0201\",시청,SAT,IN,\"1\",K1,\"24:10:00\",\"24:10:30\",성수,성수\n" +
                           "1000,\"2\",\"0201\",시청,XXX,IN,\"0\",K2,\"01:00:00\",\"01:00:30\",성수,성수\n";
        var outcome = await new TimetableParser().ParseAsync(Utf8(csv));
        Assert.Equal(2, outcome.Rows.Count);
        Assert.Single(outcome.Warnings);
        Assert.Null(outcome.Rows[0].ArriveSeconds);
        Assert.Equal(5 * 3600 + 24 * 60, outcome.Rows[0].DepartSeconds);
        Assert.Equal(DayType.Saturday, outcome.Rows[1].DayType);
        Assert.True(outcome.Rows[1].Express);
        Assert.Equal(24 * 3600 + 600, outcome.Rows[1].ArriveSeconds);
    }

    [Fact]
    public async Task CsvReader_handles_quoted_commas_and_escaped_quotes()
    {
        const string csv = "a,b\n\"x,y\",\"he said \"\"hi\"\"\"\nplain,\n";
        var rows = new List<IReadOnlyDictionary<string, string>>();
        await foreach (var r in CsvReader.ReadRecordsAsync(Utf8(csv)))
        {
            rows.Add(r);
        }

        Assert.Equal(2, rows.Count);
        Assert.Equal("x,y", rows[0]["a"]);
        Assert.Equal("he said \"hi\"", rows[0]["b"]);
        Assert.Equal("", rows[1]["b"]);
    }

    [Theory]
    [InlineData("150", "150", "1")]
    [InlineData("426", "426", "4")]
    [InlineData("2541", "2541", "5")]
    [InlineData("4102", "902", "9")]
    [InlineData("4202", "A02", "공항철도")]
    [InlineData("1251", "P313", "수인분당선")]
    public void StationCodeParser_derives_line_from_code(string code, string external, string expected)
    {
        Assert.Equal(expected, StationCodeParser.LineNoFromCode(code, external));
    }
}

public sealed class DurationParserTests
{
    [Theory]
    [InlineData("08:30", 8 * 3600 + 30 * 60)]
    [InlineData("08:30:15", 8 * 3600 + 30 * 60 + 15)]
    [InlineData("25:10", 25 * 3600 + 10 * 60)]
    [InlineData("", null)]
    [InlineData("abc", null)]
    public void ParseTimeOfDay_treats_two_parts_as_hours_minutes(string text, int? expected)
    {
        Assert.Equal(expected, DurationParser.ParseTimeOfDay(text));
    }

    [Theory]
    [InlineData("03:34", 214)]
    [InlineData("00:05", 5)]
    public void ParseDuration_treats_two_parts_as_minutes_seconds(string text, int expected)
    {
        Assert.Equal(expected, DurationParser.ParseDuration(text));
    }
}
