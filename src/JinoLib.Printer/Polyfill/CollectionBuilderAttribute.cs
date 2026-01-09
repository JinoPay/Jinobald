// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

#if NETFRAMEWORK

namespace System.Runtime.CompilerServices;

/// <summary>
/// 컬렉션 표현식을 지원하기 위한 컬렉션 빌더 속성.
/// 컴파일러가 컬렉션 리터럴 구문을 사용할 때 이 속성으로 지정된 빌더를 사용합니다.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Struct | AttributeTargets.Interface, Inherited = false)]
internal sealed class CollectionBuilderAttribute : Attribute
{
    /// <summary>
    /// 컬렉션 빌더 속성을 초기화합니다.
    /// </summary>
    /// <param name="builderType">빌더 타입</param>
    /// <param name="methodName">빌더 메서드 이름</param>
    public CollectionBuilderAttribute(Type builderType, string methodName)
    {
        BuilderType = builderType;
        MethodName = methodName;
    }

    /// <summary>
    /// 컬렉션을 생성하는 빌더 타입
    /// </summary>
    public Type BuilderType { get; }

    /// <summary>
    /// 컬렉션을 생성하는 메서드 이름
    /// </summary>
    public string MethodName { get; }
}

/// <summary>
/// 인라인 배열 속성 폴리필
/// </summary>
[AttributeUsage(AttributeTargets.Struct, AllowMultiple = false)]
internal sealed class InlineArrayAttribute : Attribute
{
    /// <summary>
    /// 인라인 배열 속성을 초기화합니다.
    /// </summary>
    /// <param name="length">배열 길이</param>
    public InlineArrayAttribute(int length)
    {
        Length = length;
    }

    /// <summary>
    /// 인라인 배열의 길이
    /// </summary>
    public int Length { get; }
}

#endif
