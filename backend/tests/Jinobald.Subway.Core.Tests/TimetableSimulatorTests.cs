using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Realtime;

namespace Jinobald.Subway.Core.Tests;

public sealed class TimetableSimulatorTests
{
    private static SimTrain Train(string no, params (string Cd, string Name, int? Arrive, int? Depart)[] stops) =>
        new(no, "UP", false, stops[^1].Name, stops.Select(s => new SimStop(s.Cd, s.Name, s.Arrive, s.Depart)).ToList());

    [Fact]
    public void Snapshot_places_train_by_progress()
    {
        var trains = new[]
        {
            Train("K1", ("0150", "서울역", null, 1000), ("0151", "시청", 1100, 1130), ("0152", "종각", 1230, null)),
        };

        static string StatusAt(IReadOnlyList<SimTrain> t, int now) =>
            TimetableSimulatorProvider.Snapshot(t, now, "1001", "1호선", "x") is [var row] ? $"{row.StatnNm}/{row.TrainSttus}" : "none";

        Assert.Equal("none", StatusAt(trains, 999));
        Assert.Equal("서울역/2", StatusAt(trains, 1010));   // 출발 직후
        Assert.Equal("시청/3", StatusAt(trains, 1050));     // 구간 중간 → 다음 역 전역출발
        Assert.Equal("시청/0", StatusAt(trains, 1090));     // 진입
        Assert.Equal("시청/1", StatusAt(trains, 1115));     // 정차 중
        Assert.Equal("종각/1", StatusAt(trains, 1230));
        Assert.Equal("none", StatusAt(trains, 1231));
    }

    [Fact]
    public void BuildTrains_splits_reused_train_numbers_by_time_gap()
    {
        var entries = new List<TimetableEntry>();
        for (var i = 0; i < 3; i++)
        {
            entries.Add(new TimetableEntry("2", $"020{i}", $"역{i}", $"역{i}", DayType.Weekday, "IN", false, "S1", 1000 + i * 100, 1030 + i * 100, "성수", "성수"));
        }

        for (var i = 0; i < 3; i++)
        {
            entries.Add(new TimetableEntry("2", $"020{i}", $"역{i}", $"역{i}", DayType.Weekday, "IN", false, "S1", 20000 + i * 100, 20030 + i * 100, "성수", "성수"));
        }

        var trains = TimetableSimulatorProvider.BuildTrains(entries);
        Assert.Equal(2, trains.Count);
        Assert.All(trains, t => Assert.Equal(3, t.Stops.Count));
    }
}
