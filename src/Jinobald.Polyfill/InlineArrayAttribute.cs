// Licensed to the .NET Foundation under one or more agreements.
// Polyfill for inline array attribute (C# 12)

#if !NET8_0_OR_GREATER
namespace System.Runtime.CompilerServices
{
    using ComponentModel;

    /// <summary>
    /// Indicates that a type should be treated as an inline array.
    /// </summary>
    [AttributeUsage(AttributeTargets.Struct, AllowMultiple = false, Inherited = false)]
    [EditorBrowsable(EditorBrowsableState.Never)]
    internal sealed class InlineArrayAttribute : Attribute
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="InlineArrayAttribute"/> class.
        /// </summary>
        /// <param name="length">The length of the inline array.</param>
        public InlineArrayAttribute(int length)
        {
            Length = length;
        }

        /// <summary>
        /// Gets the length of the inline array.
        /// </summary>
        public int Length { get; }
    }
}
#endif
