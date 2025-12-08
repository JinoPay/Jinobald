// Licensed to the .NET Foundation under one or more agreements.
// Polyfill for init accessor support (C# 9.0+)

#if !NET5_0_OR_GREATER && !NETCOREAPP3_0_OR_GREATER

namespace System.Runtime.CompilerServices
{
    using ComponentModel;

    /// <summary>
    /// Reserved to be used by the compiler for tracking metadata.
    /// This class allows the compiler to emit init-only setters for properties.
    /// </summary>
    [EditorBrowsable(EditorBrowsableState.Never)]
    public sealed class IsExternalInit
    {
    }
}

#endif
