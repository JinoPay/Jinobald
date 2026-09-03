using MediatR;

namespace Jinobald.Subway.Core.Cqrs;

/// <summary>
/// 요청이 <see cref="IValidatable"/> 이면 핸들러에 들어가기 전에 검사합니다.
/// 실패하면 <see cref="ValidationException"/> 을 던지고, API 는 이를 400 으로 바꿉니다.
/// </summary>
public sealed class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (request is IValidatable validatable)
        {
            var errors = validatable.Validate().ToList();
            if (errors.Count > 0)
            {
                throw new ValidationException(typeof(TRequest).Name, errors);
            }
        }

        return next();
    }
}

/// <summary>
/// 자기 검증이 가능한 요청. 오류 문구 목록을 돌려주며, 비어 있으면 통과입니다.
/// </summary>
public interface IValidatable
{
    IEnumerable<string> Validate();
}

/// <summary>
/// 요청 검증 실패.
/// </summary>
public sealed class ValidationException : Exception
{
    public ValidationException(string requestName, IReadOnlyList<string> errors)
        : base($"{requestName} 요청이 올바르지 않습니다: {string.Join("; ", errors)}")
    {
        RequestName = requestName;
        Errors = errors;
    }

    public string RequestName { get; }

    public IReadOnlyList<string> Errors { get; }
}
