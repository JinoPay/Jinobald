using Jinobald.Subway.Core.Cqrs;
using Jinobald.Subway.Core.Realtime;
using Jinobald.Subway.Core.Repositories;

namespace Jinobald.Subway.Core.Commands;

/// <summary>
/// 공공데이터포털 지하철알림정보를 받아 저장합니다. 키가 없으면 0 을 돌려주고 아무것도 하지 않습니다.
/// </summary>
public sealed record RefreshNoticesCommand : ICommand<int>;

public sealed class RefreshNoticesCommandHandler : ICommandHandler<RefreshNoticesCommand, int>
{
    private readonly IDataGoKrClient _client;
    private readonly ISubwayWriteRepository _write;

    public RefreshNoticesCommandHandler(IDataGoKrClient client, ISubwayWriteRepository write)
    {
        _client = client ?? throw new ArgumentNullException(nameof(client));
        _write = write ?? throw new ArgumentNullException(nameof(write));
    }

    public async Task<int> Handle(RefreshNoticesCommand request, CancellationToken cancellationToken)
    {
        if (!_client.IsConfigured)
        {
            return 0;
        }

        var notices = await _client.GetNoticesAsync(cancellationToken).ConfigureAwait(false);
        if (notices.Count > 0)
        {
            await _write.UpsertNoticesAsync(notices, cancellationToken).ConfigureAwait(false);
        }

        return notices.Count;
    }
}
