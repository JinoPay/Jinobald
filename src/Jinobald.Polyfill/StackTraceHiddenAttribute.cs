// Licensed to the .NET Foundation under one or more agreements.
// Polyfill for stack trace hidden attribute

#if !NET6_0_OR_GREATER
namespace System.Diagnostics
{
    using ComponentModel;

    /// <summary>
    /// Indicates that a method should be hidden from stack traces.
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method | AttributeTargets.Constructor | AttributeTargets.Struct, Inherited = false)]
    [EditorBrowsable(EditorBrowsableState.Never)]
    internal sealed class StackTraceHiddenAttribute : Attribute
    {
    }
}
#endif
