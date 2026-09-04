using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Jinobald.Subway.Api.Filters;

namespace Jinobald.Subway.Api.Tests;

/// <summary>
/// HTTP 수준 검사 — 라우팅, 상태 코드, 오류 어휘, 관리 키, 요청 제한, 키 없는 폴백.
/// </summary>
public sealed class EndpointTests : IClassFixture<ApiFixture>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private readonly ApiFixture _fixture;

    public EndpointTests(ApiFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task Health_reports_ok_when_timetable_is_loaded()
    {
        using var client = _fixture.CreateClient();
        var response = await client.GetAsync("/api/v1/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.True(doc.RootElement.GetProperty("ok").GetBoolean());
        Assert.Equal("timetable-simulator", doc.RootElement.GetProperty("realtimeProvider").GetString());
        Assert.False(doc.RootElement.GetProperty("keys").GetProperty("seoul").GetBoolean());
    }

    [Fact]
    public async Task Timetable_rejects_bad_after_and_day()
    {
        using var client = _fixture.CreateClient();
        var bad = await client.GetAsync("/api/v1/timetable/2/0222?after=nope");
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        Assert.Equal("validation", (await bad.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("kind").GetString());

        var badDay = await client.GetAsync("/api/v1/timetable/2/0222?day=MONDAY");
        Assert.Equal(HttpStatusCode.BadRequest, badDay.StatusCode);
    }

    [Fact]
    public async Task Timetable_next_and_last_departures()
    {
        using var client = _fixture.CreateClient();
        var next = await client.GetFromJsonAsync<JsonElement>("/api/v1/timetable/2/0222?day=DAY&direction=IN&after=05:00&limit=1", Json);
        Assert.Equal("2001", next.GetProperty("entries")[0].GetProperty("trainNo").GetString());

        var last = await client.GetFromJsonAsync<JsonElement>("/api/v1/timetable/2/0222/last?day=DAY", Json);
        var entries = last.GetProperty("entries").EnumerateArray().ToList();
        Assert.Equal(2, entries.Count);
        Assert.Contains(entries, e => e.GetProperty("trainNo").GetString() == "2099" && e.GetProperty("depart").GetString() == "24:20:00");
        Assert.Contains(entries, e => e.GetProperty("trainNo").GetString() == "2098");

        var lastIn = await client.GetFromJsonAsync<JsonElement>("/api/v1/timetable/2/0222/last?day=DAY&direction=IN", Json);
        Assert.Single(lastIn.GetProperty("entries").EnumerateArray());
    }

    [Fact]
    public async Task Admin_import_requires_key()
    {
        using var client = _fixture.CreateClient();
        var noKey = await client.PostAsync("/api/v1/admin/import", null);
        Assert.Equal(HttpStatusCode.Unauthorized, noKey.StatusCode);

        using var wrong = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/import");
        wrong.Headers.Add(AdminKeyFilter.HeaderName, "nope");
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.SendAsync(wrong)).StatusCode);

        // 맞는 키: RawDir 가 비어 있으므로 400 (인증은 통과).
        using var right = new HttpRequestMessage(HttpMethod.Post, "/api/v1/admin/import");
        right.Headers.Add(AdminKeyFilter.HeaderName, ApiFixture.AdminKey);
        var response = await client.SendAsync(right);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Arrivals_fall_back_to_timetable_without_seoul_key()
    {
        using var client = _fixture.CreateClient();
        var response = await client.GetAsync("/api/v1/realtime/arrivals/강남");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("timetable", body.GetProperty("source").GetString());
    }

    [Fact]
    public async Task OpenApi_is_not_exposed_in_production()
    {
        using var client = _fixture.CreateClient();
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/openapi/v1.json")).StatusCode);
    }
}

/// <summary>
/// 요청 제한은 파티션이 공유되므로 별도 서버에서 검사합니다.
/// </summary>
public sealed class RateLimitTests : IClassFixture<StrictRateLimitFixture>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private readonly StrictRateLimitFixture _fixture;

    public RateLimitTests(StrictRateLimitFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task Realtime_endpoints_are_rate_limited()
    {
        using var client = _fixture.CreateClient();
        HttpStatusCode last = HttpStatusCode.OK;
        for (var i = 0; i < 8; i += 1)
        {
            var response = await client.GetAsync("/api/v1/realtime/positions/1002");
            last = response.StatusCode;
            if (last == HttpStatusCode.TooManyRequests)
            {
                var body = await response.Content.ReadFromJsonAsync<JsonElement>(Json);
                Assert.Equal("quota", body.GetProperty("kind").GetString());
                return;
            }
        }

        Assert.Fail($"8회 안에 429 가 나와야 합니다 (마지막 {last}).");
    }
}
