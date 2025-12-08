// Licensed to the .NET Foundation under one or more agreements.
// Polyfill for diagnostic and validation attributes

#if !NET7_0_OR_GREATER
namespace System.Diagnostics.CodeAnalysis
{
    using ComponentModel;

    /// <summary>
    /// Specifies the syntax used in a string.
    /// </summary>
    [AttributeUsage(AttributeTargets.Parameter | AttributeTargets.Field | AttributeTargets.Property, AllowMultiple = false, Inherited = false)]
    [EditorBrowsable(EditorBrowsableState.Never)]
    internal sealed class StringSyntaxAttribute : Attribute
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="StringSyntaxAttribute"/> class.
        /// </summary>
        /// <param name="syntax">The syntax identifier.</param>
        public StringSyntaxAttribute(string syntax)
        {
            Syntax = syntax;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="StringSyntaxAttribute"/> class.
        /// </summary>
        /// <param name="syntax">The syntax identifier.</param>
        /// <param name="arguments">Optional arguments associated with the specific syntax employed.</param>
        public StringSyntaxAttribute(string syntax, params object?[] arguments)
        {
            Syntax = syntax;
            Arguments = arguments;
        }

        /// <summary>
        /// Gets the syntax identifier.
        /// </summary>
        public string Syntax { get; }

        /// <summary>
        /// Gets optional arguments associated with the specific syntax employed.
        /// </summary>
        public object?[]? Arguments { get; }

        /// <summary>
        /// The syntax identifier for strings containing composite formats for string formatting.
        /// </summary>
        public const string CompositeFormat = nameof(CompositeFormat);

        /// <summary>
        /// The syntax identifier for strings containing date format specifiers.
        /// </summary>
        public const string DateOnlyFormat = nameof(DateOnlyFormat);

        /// <summary>
        /// The syntax identifier for strings containing date and time format specifiers.
        /// </summary>
        public const string DateTimeFormat = nameof(DateTimeFormat);

        /// <summary>
        /// The syntax identifier for strings containing enum format specifiers.
        /// </summary>
        public const string EnumFormat = nameof(EnumFormat);

        /// <summary>
        /// The syntax identifier for strings containing GUID format specifiers.
        /// </summary>
        public const string GuidFormat = nameof(GuidFormat);

        /// <summary>
        /// The syntax identifier for strings containing JavaScript Object Notation (JSON).
        /// </summary>
        public const string Json = nameof(Json);

        /// <summary>
        /// The syntax identifier for strings containing numeric format specifiers.
        /// </summary>
        public const string NumericFormat = nameof(NumericFormat);

        /// <summary>
        /// The syntax identifier for strings containing regular expressions.
        /// </summary>
        public const string Regex = nameof(Regex);

        /// <summary>
        /// The syntax identifier for strings containing time format specifiers.
        /// </summary>
        public const string TimeOnlyFormat = nameof(TimeOnlyFormat);

        /// <summary>
        /// The syntax identifier for strings containing time span format specifiers.
        /// </summary>
        public const string TimeSpanFormat = nameof(TimeSpanFormat);

        /// <summary>
        /// The syntax identifier for strings containing URIs.
        /// </summary>
        public const string Uri = nameof(Uri);

        /// <summary>
        /// The syntax identifier for strings containing XML.
        /// </summary>
        public const string Xml = nameof(Xml);
    }
}
#endif

#if !NET7_0_OR_GREATER
namespace System.Runtime.CompilerServices
{
    using ComponentModel;

    /// <summary>
    /// Used to indicate a byref escapes and is not scoped.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Property | AttributeTargets.Parameter, AllowMultiple = false, Inherited = false)]
    [EditorBrowsable(EditorBrowsableState.Never)]
    internal sealed class UnscopedRefAttribute : Attribute
    {
    }
}
#endif

#if !NET11_0_OR_GREATER
namespace System.Runtime.CompilerServices
{
    using ComponentModel;

    /// <summary>
    /// Indicates the priority of a member in overload resolution. When unspecified, the default priority is 0.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Constructor | AttributeTargets.Property, AllowMultiple = false, Inherited = false)]
    [EditorBrowsable(EditorBrowsableState.Never)]
    internal sealed class OverloadResolutionPriorityAttribute : Attribute
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="OverloadResolutionPriorityAttribute"/> class.
        /// </summary>
        /// <param name="priority">The priority of the attributed member. Higher numbers are prioritized.</param>
        public OverloadResolutionPriorityAttribute(int priority)
        {
            Priority = priority;
        }

        /// <summary>
        /// Gets the priority of the member.
        /// </summary>
        public int Priority { get; }
    }
}
#endif
