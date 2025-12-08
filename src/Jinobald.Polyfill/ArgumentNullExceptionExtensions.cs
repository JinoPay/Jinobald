// Licensed to the .NET Foundation under one or more agreements.
// Polyfill for ArgumentNullException.ThrowIfNull using C# 13 implicit extensions

using System.Diagnostics.CodeAnalysis;

namespace System
{
    /// <summary>
    /// Provides extension methods for <see cref="ArgumentNullException"/>.
    /// </summary>
    public static class ArgumentNullExceptionExtensionEx
    {
        extension(ArgumentNullException)
        {
            /// <summary>
            /// Throws an <see cref="ArgumentNullException"/> if <paramref name="argument"/> is null.
            /// </summary>
            /// <param name="argument">The reference type argument to validate as non-null.</param>
            /// <param name="paramName">
            /// The name of the parameter with which <paramref name="argument"/> corresponds.
            /// Automatically captured from the argument expression.
            /// </param>
            public static void ThrowIfNull([NotNull] object? argument,
#if NET6_0_OR_GREATER
                [Runtime.CompilerServices.CallerArgumentExpression(nameof(argument))]
#endif
                string? paramName = null)
            {
#if NET6_0_OR_GREATER
                ArgumentNullException.ThrowIfNull(argument, paramName);
#else
                if (argument is null) throw new ArgumentNullException(paramName);
#endif
            }
        }
    }
}
