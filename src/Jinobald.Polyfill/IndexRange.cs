// Polyfill for Index and Range types (C# 8.0)
// This enables the use of range operators [..] and index from end [^]

#if !NETCOREAPP3_0_OR_GREATER && !NETSTANDARD2_1_OR_GREATER
namespace System
{
    using Runtime.CompilerServices;

    /// <summary>
    /// Represents a type that can be used to index a collection either from the start or the end.
    /// </summary>
    public readonly struct Index : IEquatable<Index>
    {
        private readonly int _value;

        /// <summary>
        /// Construct an Index using a value and indicating if the index is from the start or from the end.
        /// </summary>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public Index(int value, bool fromEnd = false)
        {
            if (value < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(value), "value must be non-negative");
            }

            _value = fromEnd ? ~value : value;
        }

        private Index(int value)
        {
            _value = value;
        }

        /// <summary>
        /// Gets an Index that points to the first element.
        /// </summary>
        public static Index Start => new Index(0);

        /// <summary>
        /// Gets an Index that points to the end.
        /// </summary>
        public static Index End => new Index(~0);

        /// <summary>
        /// Gets the index value.
        /// </summary>
        public int Value => _value < 0 ? ~_value : _value;

        /// <summary>
        /// Gets whether the Index is from the end.
        /// </summary>
        public bool IsFromEnd => _value < 0;

        /// <summary>
        /// Calculate the offset from the start using the given collection length.
        /// </summary>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public int GetOffset(int length)
        {
            int offset = _value;
            if (IsFromEnd)
            {
                offset += length + 1;
            }
            return offset;
        }

        /// <inheritdoc/>
        public override bool Equals(object? obj) => obj is Index index && _value == index._value;

        /// <inheritdoc/>
        public bool Equals(Index other) => _value == other._value;

        /// <inheritdoc/>
        public override int GetHashCode() => _value;

        /// <summary>
        /// Converts an integer to an Index.
        /// </summary>
        public static implicit operator Index(int value) => FromStart(value);

        /// <summary>
        /// Creates an Index from the start at the specified position.
        /// </summary>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static Index FromStart(int value)
        {
            if (value < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(value), "value must be non-negative");
            }
            return new Index(value);
        }

        /// <summary>
        /// Creates an Index from the end at the specified position.
        /// </summary>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public static Index FromEnd(int value)
        {
            if (value < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(value), "value must be non-negative");
            }
            return new Index(~value);
        }

        /// <inheritdoc/>
        public override string ToString()
        {
            if (IsFromEnd)
                return "^" + ((uint)Value).ToString();
            return ((uint)Value).ToString();
        }
    }

    /// <summary>
    /// Represents a range that has start and end indexes.
    /// </summary>
    public readonly struct Range : IEquatable<Range>
    {
        /// <summary>
        /// Gets the start index of the range.
        /// </summary>
        public Index Start { get; }

        /// <summary>
        /// Gets the end index of the range.
        /// </summary>
        public Index End { get; }

        /// <summary>
        /// Constructs a Range with start and end indexes.
        /// </summary>
        public Range(Index start, Index end)
        {
            Start = start;
            End = end;
        }

        /// <inheritdoc/>
        public override bool Equals(object? obj) =>
            obj is Range r && r.Start.Equals(Start) && r.End.Equals(End);

        /// <inheritdoc/>
        public bool Equals(Range other) => other.Start.Equals(Start) && other.End.Equals(End);

        /// <inheritdoc/>
        public override int GetHashCode()
        {
            return HashCode.Combine(Start.GetHashCode(), End.GetHashCode());
        }

        /// <inheritdoc/>
        public override string ToString()
        {
            return Start + ".." + End;
        }

        /// <summary>
        /// Creates a Range starting from the specified index to the end.
        /// </summary>
        public static Range StartAt(Index start) => new Range(start, Index.End);

        /// <summary>
        /// Creates a Range from the start to the specified index.
        /// </summary>
        public static Range EndAt(Index end) => new Range(Index.Start, end);

        /// <summary>
        /// Gets a Range that represents all elements.
        /// </summary>
        public static Range All => new Range(Index.Start, Index.End);

        /// <summary>
        /// Calculate the start offset and length of the range using the given collection length.
        /// </summary>
        [MethodImpl(MethodImplOptions.AggressiveInlining)]
        public (int Offset, int Length) GetOffsetAndLength(int length)
        {
            int start = Start.IsFromEnd ? length - Start.Value : Start.Value;
            int end = End.IsFromEnd ? length - End.Value : End.Value;

            if ((uint)end > (uint)length || (uint)start > (uint)end)
            {
                throw new ArgumentOutOfRangeException(nameof(length));
            }

            return (start, end - start);
        }
    }

    internal static class HashCode
    {
        public static int Combine(int h1, int h2)
        {
            uint rol5 = ((uint)h1 << 5) | ((uint)h1 >> 27);
            return ((int)rol5 + h1) ^ h2;
        }
    }
}

namespace System.Runtime.CompilerServices
{
    /// <summary>
    /// Helper methods for runtime operations related to Range and Index.
    /// </summary>
    internal static class RuntimeHelpersExtensions
    {
        public static T[] GetSubArray<T>(T[] array, Range range)
        {
            if (array == null)
            {
                throw new ArgumentNullException(nameof(array));
            }

            var (offset, length) = range.GetOffsetAndLength(array.Length);

            if (default(T) != null || typeof(T[]) == array.GetType())
            {
                if (length == 0)
                {
                    return Array.Empty<T>();
                }

                var dest = new T[length];
                Array.Copy(array, offset, dest, 0, length);
                return dest;
            }
            else
            {
                var dest = (T[])Array.CreateInstance(array.GetType().GetElementType()!, length);
                Array.Copy(array, offset, dest, 0, length);
                return dest;
            }
        }
    }
}
#endif
