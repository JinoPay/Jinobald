using Jinobald.Subway.Core.Cqrs;
using Jinobald.Subway.Core.Domain;
using Jinobald.Subway.Core.Realtime;

namespace Jinobald.Subway.Core.Queries;

/// <summary>
/// 한 역의 실시간 도착정보 (서울 API 원본 행).
/// </summary>
public sealed record GetArrivalsQuery(string StationName) : IQuery<Cached<IReadOnlyList<RawArrivalRow>>>, IValidatable
{
    public IEnumerable<string> Validate()
    {
        if (string.IsNullOrWhiteSpace(StationName))
        {
            yield return "역명이 비어 있습니다.";
        }
    }
}

public sealed class GetArrivalsQueryHandler : IQueryHandler<GetArrivalsQuery, Cached<IReadOnlyList<RawArrivalRow>>>
{
    private readonly IRealtimeProvider _provider;

    public GetArrivalsQueryHandler(IRealtimeProvider provider)
    {
        _provider = provider ?? throw new ArgumentNullException(nameof(provider));
    }

    public Task<Cached<IReadOnlyList<RawArrivalRow>>> Handle(GetArrivalsQuery request, CancellationToken cancellationToken) =>
        _provider.GetArrivalsAsync(request.StationName.Trim(), cancellationToken);
}

/// <summary>
/// 한 노선의 열차 위치. <c>SubwayId</c> 는 "1002" 같은 서울 API 노선 id.
/// </summary>
public sealed record GetLinePositionsQuery(string SubwayId) : IQuery<Cached<IReadOnlyList<RawPositionRow>>>, IValidatable
{
    public IEnumerable<string> Validate()
    {
        if (SubwayLines.NameOf(SubwayId) is null)
        {
            yield return $"알 수 없는 노선 id 입니다: {SubwayId}";
        }
    }
}

public sealed class GetLinePositionsQueryHandler : IQueryHandler<GetLinePositionsQuery, Cached<IReadOnlyList<RawPositionRow>>>
{
    private readonly IRealtimeProvider _provider;

    public GetLinePositionsQueryHandler(IRealtimeProvider provider)
    {
        _provider = provider ?? throw new ArgumentNullException(nameof(provider));
    }

    public Task<Cached<IReadOnlyList<RawPositionRow>>> Handle(GetLinePositionsQuery request, CancellationToken cancellationToken) =>
        _provider.GetPositionsAsync(request.SubwayId, cancellationToken);
}
