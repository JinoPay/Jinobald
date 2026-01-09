// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

#if NETFRAMEWORK

namespace System;

/// <summary>
/// 컬렉션의 시작 또는 끝에서부터의 인덱스를 나타냅니다.
/// </summary>
public readonly struct Index : IEquatable<Index>
{
    private readonly int _value;

    /// <summary>
    /// 새 인덱스를 생성합니다.
    /// </summary>
    /// <param name="value">인덱스 값</param>
    /// <param name="fromEnd">끝에서부터의 인덱스 여부</param>
    public Index(int value, bool fromEnd = false)
    {
        if (value < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(value), "인덱스 값은 0 이상이어야 합니다.");
        }

        _value = fromEnd ? ~value : value;
    }

    private Index(int value)
    {
        _value = value;
    }

    /// <summary>
    /// 시작 인덱스 (0)
    /// </summary>
    public static Index Start => new(0);

    /// <summary>
    /// 끝 인덱스 (^0)
    /// </summary>
    public static Index End => new(~0);

    /// <summary>
    /// 인덱스 값을 반환합니다.
    /// </summary>
    public int Value => _value < 0 ? ~_value : _value;

    /// <summary>
    /// 끝에서부터의 인덱스인지 여부를 반환합니다.
    /// </summary>
    public bool IsFromEnd => _value < 0;

    /// <summary>
    /// 컬렉션 길이를 기준으로 실제 오프셋을 계산합니다.
    /// </summary>
    /// <param name="length">컬렉션 길이</param>
    /// <returns>실제 오프셋</returns>
    public int GetOffset(int length)
    {
        var offset = _value;
        if (IsFromEnd)
        {
            offset = length + ~_value + 1;
        }
        return offset;
    }

    /// <summary>
    /// 시작에서부터의 인덱스를 생성합니다.
    /// </summary>
    public static Index FromStart(int value) => new(value);

    /// <summary>
    /// 끝에서부터의 인덱스를 생성합니다.
    /// </summary>
    public static Index FromEnd(int value) => new(value, fromEnd: true);

    /// <summary>
    /// int에서 Index로 암시적 변환
    /// </summary>
    public static implicit operator Index(int value) => FromStart(value);

    /// <inheritdoc/>
    public bool Equals(Index other) => _value == other._value;

    /// <inheritdoc/>
    public override bool Equals(object? obj) => obj is Index other && Equals(other);

    /// <inheritdoc/>
    public override int GetHashCode() => _value;

    /// <inheritdoc/>
    public override string ToString() => IsFromEnd ? $"^{Value}" : Value.ToString();
}

/// <summary>
/// 시작과 끝 인덱스를 가진 범위를 나타냅니다.
/// </summary>
public readonly struct Range : IEquatable<Range>
{
    /// <summary>
    /// 범위의 시작 인덱스
    /// </summary>
    public Index Start { get; }

    /// <summary>
    /// 범위의 끝 인덱스 (제외)
    /// </summary>
    public Index End { get; }

    /// <summary>
    /// 새 범위를 생성합니다.
    /// </summary>
    /// <param name="start">시작 인덱스</param>
    /// <param name="end">끝 인덱스</param>
    public Range(Index start, Index end)
    {
        Start = start;
        End = end;
    }

    /// <summary>
    /// 지정된 시작부터 끝까지의 범위를 생성합니다.
    /// </summary>
    public static Range StartAt(Index start) => new(start, Index.End);

    /// <summary>
    /// 처음부터 지정된 끝까지의 범위를 생성합니다.
    /// </summary>
    public static Range EndAt(Index end) => new(Index.Start, end);

    /// <summary>
    /// 전체 범위 (0..^0)
    /// </summary>
    public static Range All => new(Index.Start, Index.End);

    /// <summary>
    /// 컬렉션 길이를 기준으로 오프셋과 길이를 계산합니다.
    /// </summary>
    /// <param name="length">컬렉션 길이</param>
    /// <returns>오프셋과 길이 튜플</returns>
    public (int Offset, int Length) GetOffsetAndLength(int length)
    {
        var start = Start.GetOffset(length);
        var end = End.GetOffset(length);
        return (start, end - start);
    }

    /// <inheritdoc/>
    public bool Equals(Range other) => Start.Equals(other.Start) && End.Equals(other.End);

    /// <inheritdoc/>
    public override bool Equals(object? obj) => obj is Range other && Equals(other);

    /// <inheritdoc/>
    public override int GetHashCode() => Start.GetHashCode() * 31 + End.GetHashCode();

    /// <inheritdoc/>
    public override string ToString() => $"{Start}..{End}";
}

namespace Runtime.CompilerServices
{
    /// <summary>
    /// RuntimeHelpers 확장 - 배열 슬라이싱 지원
    /// </summary>
    internal static class RuntimeHelpersEx
    {
        /// <summary>
        /// 배열의 하위 배열을 반환합니다.
        /// </summary>
        public static T[] GetSubArray<T>(T[] array, Range range)
        {
            var (offset, length) = range.GetOffsetAndLength(array.Length);
            var result = new T[length];
            Array.Copy(array, offset, result, 0, length);
            return result;
        }
    }
}

#endif
