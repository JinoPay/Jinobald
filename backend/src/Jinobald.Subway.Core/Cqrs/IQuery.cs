using MediatR;

namespace Jinobald.Subway.Core.Cqrs;

/// <summary>
/// 읽기 요청. 상태를 바꾸지 않으며 API 엔드포인트가 그대로 보냅니다.
/// </summary>
public interface IQuery<out TResult> : IRequest<TResult>;

/// <summary>
/// 쓰기 요청. 데이터 적재·갱신처럼 상태를 바꿉니다.
/// </summary>
public interface ICommand<out TResult> : IRequest<TResult>;

/// <summary>
/// <see cref="IQuery{TResult}"/> 핸들러.
/// </summary>
public interface IQueryHandler<in TQuery, TResult> : IRequestHandler<TQuery, TResult>
    where TQuery : IQuery<TResult>;

/// <summary>
/// <see cref="ICommand{TResult}"/> 핸들러.
/// </summary>
public interface ICommandHandler<in TCommand, TResult> : IRequestHandler<TCommand, TResult>
    where TCommand : ICommand<TResult>;
