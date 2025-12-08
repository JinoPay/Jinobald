// Polyfill attributes for C# nullable reference types

using System.Diagnostics.CodeAnalysis;

#if !NET5_0_OR_GREATER
namespace System.Diagnostics.CodeAnalysis
{
    /// <summary>
    ///     Specifies that null is allowed as an input even if the corresponding type disallows it.
    /// </summary>
    [AttributeUsage(AttributeTargets.Field | AttributeTargets.Parameter | AttributeTargets.Property)]
    internal sealed class AllowNullAttribute : Attribute
    {
    }

    /// <summary>
    ///     Specifies that null is disallowed as an input even if the corresponding type allows it.
    /// </summary>
    [AttributeUsage(AttributeTargets.Field | AttributeTargets.Parameter | AttributeTargets.Property)]
    internal sealed class DisallowNullAttribute : Attribute
    {
    }

    /// <summary>
    ///     Specifies that an output may be null even if the corresponding type disallows it.
    /// </summary>
    [AttributeUsage(AttributeTargets.Field | AttributeTargets.Parameter | AttributeTargets.Property |
                    AttributeTargets.ReturnValue)]
    internal sealed class MaybeNullAttribute : Attribute
    {
    }

    /// <summary>
    ///     Specifies that an output will not be null even if the corresponding type allows it.
    /// </summary>
    [AttributeUsage(AttributeTargets.Field | AttributeTargets.Parameter | AttributeTargets.Property |
                    AttributeTargets.ReturnValue)]
    internal sealed class NotNullAttribute : Attribute
    {
    }

    /// <summary>
    ///     Specifies that when a method returns <see cref="ReturnValue" />, the parameter may be null even if the
    ///     corresponding type disallows it.
    /// </summary>
    [AttributeUsage(AttributeTargets.Parameter)]
    internal sealed class MaybeNullWhenAttribute : Attribute
    {
        public MaybeNullWhenAttribute(bool returnValue)
        {
            ReturnValue = returnValue;
        }

        public bool ReturnValue { get; }
    }

    /// <summary>
    ///     Specifies that when a method returns <see cref="ReturnValue" />, the parameter will not be null even if the
    ///     corresponding type allows it.
    /// </summary>
    [AttributeUsage(AttributeTargets.Parameter)]
    internal sealed class NotNullWhenAttribute : Attribute
    {
        public NotNullWhenAttribute(bool returnValue)
        {
            ReturnValue = returnValue;
        }

        public bool ReturnValue { get; }
    }

    /// <summary>
    ///     Specifies that the output will be non-null if the named parameter is non-null.
    /// </summary>
    [AttributeUsage(AttributeTargets.Parameter | AttributeTargets.Property | AttributeTargets.ReturnValue,
        AllowMultiple = true)]
    internal sealed class NotNullIfNotNullAttribute : Attribute
    {
        public NotNullIfNotNullAttribute(string parameterName)
        {
            ParameterName = parameterName;
        }

        public string ParameterName { get; }
    }

    /// <summary>
    ///     Applied to a method that will never return under any circumstance.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method, Inherited = false)]
    internal sealed class DoesNotReturnAttribute : Attribute
    {
    }

    /// <summary>
    ///     Specifies that the method will not return if the associated Boolean parameter is passed the specified value.
    /// </summary>
    [AttributeUsage(AttributeTargets.Parameter)]
    internal sealed class DoesNotReturnIfAttribute : Attribute
    {
        public DoesNotReturnIfAttribute(bool parameterValue)
        {
            ParameterValue = parameterValue;
        }

        public bool ParameterValue { get; }
    }
}
#endif

// CallerArgumentExpression attribute for .NET Standard 2.0 and .NET Framework
#if !NET6_0_OR_GREATER
namespace System.Runtime.CompilerServices
{
    /// <summary>
    ///     Indicates that a parameter captures the expression passed for another parameter as a string.
    /// </summary>
    [AttributeUsage(AttributeTargets.Parameter)]
    internal sealed class CallerArgumentExpressionAttribute : Attribute
    {
        public CallerArgumentExpressionAttribute(string parameterName)
        {
            ParameterName = parameterName;
        }

        public string ParameterName { get; }
    }
}
#endif

namespace System
{
    public static class ArgumentNullExceptionExtensionEx
    {
        extension(ArgumentNullException)
        {
            /// <summary>
            ///     Throws an <see cref="ArgumentNullException" /> if <paramref name="argument" /> is null.
            /// </summary>
            /// <param name="argument">The reference type argument to validate as non-null.</param>
            /// <param name="paramName">
            ///     The name of the parameter with which <paramref name="argument" /> corresponds.
            ///     Automatically captured from the argument expression.
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