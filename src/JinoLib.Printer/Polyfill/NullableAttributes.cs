// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

#if NETFRAMEWORK

namespace System.Diagnostics.CodeAnalysis;

/// <summary>
/// null이 허용되지 않는 입력에서도 null을 허용함을 나타냅니다.
/// </summary>
[AttributeUsage(AttributeTargets.Field | AttributeTargets.Parameter | AttributeTargets.Property, Inherited = false)]
internal sealed class AllowNullAttribute : Attribute
{
}

/// <summary>
/// null을 허용하는 입력에서 null을 허용하지 않음을 나타냅니다.
/// </summary>
[AttributeUsage(AttributeTargets.Field | AttributeTargets.Parameter | AttributeTargets.Property, Inherited = false)]
internal sealed class DisallowNullAttribute : Attribute
{
}

/// <summary>
/// null이 허용되지 않는 출력이 null일 수 있음을 나타냅니다.
/// </summary>
[AttributeUsage(AttributeTargets.Field | AttributeTargets.Parameter | AttributeTargets.Property | AttributeTargets.ReturnValue, Inherited = false)]
internal sealed class MaybeNullAttribute : Attribute
{
}

/// <summary>
/// null을 허용하는 출력이 null이 아님을 나타냅니다.
/// </summary>
[AttributeUsage(AttributeTargets.Field | AttributeTargets.Parameter | AttributeTargets.Property | AttributeTargets.ReturnValue, Inherited = false)]
internal sealed class NotNullAttribute : Attribute
{
}

/// <summary>
/// 메서드가 특정 bool 값을 반환할 때 출력이 null일 수 있음을 나타냅니다.
/// </summary>
[AttributeUsage(AttributeTargets.Parameter, Inherited = false)]
internal sealed class MaybeNullWhenAttribute : Attribute
{
    /// <summary>
    /// 속성을 초기화합니다.
    /// </summary>
    /// <param name="returnValue">출력이 null일 수 있는 반환 값</param>
    public MaybeNullWhenAttribute(bool returnValue) => ReturnValue = returnValue;

    /// <summary>
    /// 출력이 null일 수 있는 반환 값
    /// </summary>
    public bool ReturnValue { get; }
}

/// <summary>
/// 메서드가 특정 bool 값을 반환할 때 출력이 null이 아님을 나타냅니다.
/// </summary>
[AttributeUsage(AttributeTargets.Parameter, Inherited = false)]
internal sealed class NotNullWhenAttribute : Attribute
{
    /// <summary>
    /// 속성을 초기화합니다.
    /// </summary>
    /// <param name="returnValue">출력이 null이 아닌 반환 값</param>
    public NotNullWhenAttribute(bool returnValue) => ReturnValue = returnValue;

    /// <summary>
    /// 출력이 null이 아닌 반환 값
    /// </summary>
    public bool ReturnValue { get; }
}

/// <summary>
/// 지정된 매개변수가 null이 아니면 출력이 null이 아님을 나타냅니다.
/// </summary>
[AttributeUsage(AttributeTargets.Parameter | AttributeTargets.Property | AttributeTargets.ReturnValue, AllowMultiple = true, Inherited = false)]
internal sealed class NotNullIfNotNullAttribute : Attribute
{
    /// <summary>
    /// 속성을 초기화합니다.
    /// </summary>
    /// <param name="parameterName">null 여부를 확인할 매개변수 이름</param>
    public NotNullIfNotNullAttribute(string parameterName) => ParameterName = parameterName;

    /// <summary>
    /// null 여부를 확인할 매개변수 이름
    /// </summary>
    public string ParameterName { get; }
}

/// <summary>
/// 메서드가 절대 정상적으로 반환되지 않음을 나타냅니다 (항상 예외를 throw).
/// </summary>
[AttributeUsage(AttributeTargets.Method, Inherited = false)]
internal sealed class DoesNotReturnAttribute : Attribute
{
}

/// <summary>
/// 매개변수가 특정 bool 값일 때 메서드가 반환되지 않음을 나타냅니다.
/// </summary>
[AttributeUsage(AttributeTargets.Parameter, Inherited = false)]
internal sealed class DoesNotReturnIfAttribute : Attribute
{
    /// <summary>
    /// 속성을 초기화합니다.
    /// </summary>
    /// <param name="parameterValue">메서드가 반환되지 않는 매개변수 값</param>
    public DoesNotReturnIfAttribute(bool parameterValue) => ParameterValue = parameterValue;

    /// <summary>
    /// 메서드가 반환되지 않는 매개변수 값
    /// </summary>
    public bool ParameterValue { get; }
}

/// <summary>
/// 메서드가 반환될 때 지정된 멤버가 null이 아님을 나타냅니다.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Property, AllowMultiple = true, Inherited = false)]
internal sealed class MemberNotNullAttribute : Attribute
{
    /// <summary>
    /// 속성을 초기화합니다.
    /// </summary>
    /// <param name="member">null이 아닌 멤버 이름</param>
    public MemberNotNullAttribute(string member) => Members = new[] { member };

    /// <summary>
    /// 속성을 초기화합니다.
    /// </summary>
    /// <param name="members">null이 아닌 멤버 이름들</param>
    public MemberNotNullAttribute(params string[] members) => Members = members;

    /// <summary>
    /// null이 아닌 멤버 이름들
    /// </summary>
    public string[] Members { get; }
}

/// <summary>
/// 메서드가 특정 bool 값을 반환할 때 지정된 멤버가 null이 아님을 나타냅니다.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Property, AllowMultiple = true, Inherited = false)]
internal sealed class MemberNotNullWhenAttribute : Attribute
{
    /// <summary>
    /// 속성을 초기화합니다.
    /// </summary>
    /// <param name="returnValue">멤버가 null이 아닌 반환 값</param>
    /// <param name="member">null이 아닌 멤버 이름</param>
    public MemberNotNullWhenAttribute(bool returnValue, string member)
    {
        ReturnValue = returnValue;
        Members = new[] { member };
    }

    /// <summary>
    /// 속성을 초기화합니다.
    /// </summary>
    /// <param name="returnValue">멤버가 null이 아닌 반환 값</param>
    /// <param name="members">null이 아닌 멤버 이름들</param>
    public MemberNotNullWhenAttribute(bool returnValue, params string[] members)
    {
        ReturnValue = returnValue;
        Members = members;
    }

    /// <summary>
    /// 멤버가 null이 아닌 반환 값
    /// </summary>
    public bool ReturnValue { get; }

    /// <summary>
    /// null이 아닌 멤버 이름들
    /// </summary>
    public string[] Members { get; }
}

#endif
