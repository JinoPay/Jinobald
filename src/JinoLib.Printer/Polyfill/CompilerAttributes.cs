// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

#if NETFRAMEWORK

namespace System.Runtime.CompilerServices;

/// <summary>
/// 로컬 변수의 0 초기화를 건너뛰도록 합니다.
/// </summary>
[AttributeUsage(AttributeTargets.Module | AttributeTargets.Class | AttributeTargets.Struct | AttributeTargets.Interface | AttributeTargets.Constructor | AttributeTargets.Method | AttributeTargets.Property | AttributeTargets.Event, Inherited = false)]
internal sealed class SkipLocalsInitAttribute : Attribute
{
}

/// <summary>
/// 메서드를 모듈 초기화자로 표시합니다.
/// </summary>
[AttributeUsage(AttributeTargets.Method, Inherited = false)]
internal sealed class ModuleInitializerAttribute : Attribute
{
}

/// <summary>
/// 보간 문자열 핸들러임을 나타냅니다.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Struct, AllowMultiple = false, Inherited = false)]
internal sealed class InterpolatedStringHandlerAttribute : Attribute
{
}

/// <summary>
/// 보간 문자열 핸들러 생성자에 전달할 인수를 지정합니다.
/// </summary>
[AttributeUsage(AttributeTargets.Parameter, AllowMultiple = false, Inherited = false)]
internal sealed class InterpolatedStringHandlerArgumentAttribute : Attribute
{
    /// <summary>
    /// 속성을 초기화합니다.
    /// </summary>
    /// <param name="argument">핸들러에 전달할 인수 이름</param>
    public InterpolatedStringHandlerArgumentAttribute(string argument) => Arguments = new[] { argument };

    /// <summary>
    /// 속성을 초기화합니다.
    /// </summary>
    /// <param name="arguments">핸들러에 전달할 인수 이름들</param>
    public InterpolatedStringHandlerArgumentAttribute(params string[] arguments) => Arguments = arguments;

    /// <summary>
    /// 핸들러에 전달할 인수 이름들
    /// </summary>
    public string[] Arguments { get; }
}

/// <summary>
/// 호출 표현식의 매개변수 이름을 캡처합니다.
/// </summary>
[AttributeUsage(AttributeTargets.Parameter, AllowMultiple = false, Inherited = false)]
internal sealed class CallerArgumentExpressionAttribute : Attribute
{
    /// <summary>
    /// 속성을 초기화합니다.
    /// </summary>
    /// <param name="parameterName">표현식을 캡처할 매개변수 이름</param>
    public CallerArgumentExpressionAttribute(string parameterName) => ParameterName = parameterName;

    /// <summary>
    /// 표현식을 캡처할 매개변수 이름
    /// </summary>
    public string ParameterName { get; }
}

/// <summary>
/// 필수 멤버가 있는 타입임을 나타냅니다.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Struct | AttributeTargets.Field | AttributeTargets.Property, AllowMultiple = false, Inherited = false)]
internal sealed class RequiredMemberAttribute : Attribute
{
}

/// <summary>
/// 생성자가 모든 필수 멤버를 초기화함을 나타냅니다.
/// </summary>
[AttributeUsage(AttributeTargets.Constructor, AllowMultiple = false, Inherited = false)]
internal sealed class SetsRequiredMembersAttribute : Attribute
{
}

/// <summary>
/// 특정 컴파일러 기능이 필요함을 나타냅니다.
/// </summary>
[AttributeUsage(AttributeTargets.All, AllowMultiple = true, Inherited = false)]
internal sealed class CompilerFeatureRequiredAttribute : Attribute
{
    /// <summary>
    /// required 멤버 기능 이름
    /// </summary>
    public const string RequiredMembers = nameof(RequiredMembers);

    /// <summary>
    /// ref struct 기능 이름
    /// </summary>
    public const string RefStructs = nameof(RefStructs);

    /// <summary>
    /// 속성을 초기화합니다.
    /// </summary>
    /// <param name="featureName">필요한 기능 이름</param>
    public CompilerFeatureRequiredAttribute(string featureName) => FeatureName = featureName;

    /// <summary>
    /// 필요한 기능 이름
    /// </summary>
    public string FeatureName { get; }

    /// <summary>
    /// 기능이 선택 사항인지 여부
    /// </summary>
    public bool IsOptional { get; init; }
}

#endif
