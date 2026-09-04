using System.Security.Cryptography;
using System.Text;
using Jinobald.Subway.Api.Contracts;

namespace Jinobald.Subway.Api.Filters;

/// <summary>
/// 관리 엔드포인트 보호. <c>Admin:ApiKey</c> 가 비어 있으면 엔드포인트가 없는 것처럼 404 를 내고,
/// 있으면 <c>X-Admin-Key</c> 헤더를 고정 시간 비교로 확인합니다.
/// </summary>
public sealed class AdminKeyFilter : IEndpointFilter
{
    public const string HeaderName = "X-Admin-Key";

    private readonly string? _expected;

    public AdminKeyFilter(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        _expected = configuration["Admin:ApiKey"];
    }

    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        if (string.IsNullOrWhiteSpace(_expected))
        {
            return Results.NotFound();
        }

        var provided = context.HttpContext.Request.Headers[HeaderName].ToString();
        if (!FixedTimeEquals(provided, _expected))
        {
            return Results.Json(new ErrorResponse("auth", "관리 키가 맞지 않습니다."), statusCode: StatusCodes.Status401Unauthorized);
        }

        return await next(context).ConfigureAwait(false);
    }

    private static bool FixedTimeEquals(string a, string b)
    {
        var left = Encoding.UTF8.GetBytes(a);
        var right = Encoding.UTF8.GetBytes(b);
        // 길이가 다르면 바로 false 지만, 길이 자체는 비밀이 아닙니다.
        return left.Length == right.Length && CryptographicOperations.FixedTimeEquals(left, right);
    }
}
