// Polyfill for various compiler attributes

#if !NET5_0_OR_GREATER
namespace System.Runtime.CompilerServices
{
    using ComponentModel;

    /// <summary>
    /// Indicates that the .NET runtime should not initialize local variables.
    /// </summary>
    [AttributeUsage(AttributeTargets.Module | AttributeTargets.Class | AttributeTargets.Struct | AttributeTargets.Constructor | AttributeTargets.Method | AttributeTargets.Property | AttributeTargets.Event | AttributeTargets.Interface, Inherited = false)]
    [EditorBrowsable(EditorBrowsableState.Never)]
    internal sealed class SkipLocalsInitAttribute : Attribute
    {
    }

    /// <summary>
    /// Indicates that a method should be called to perform module initialization.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method, Inherited = false)]
    [EditorBrowsable(EditorBrowsableState.Never)]
    internal sealed class ModuleInitializerAttribute : Attribute
    {
    }
}
#endif

#if !NET6_0_OR_GREATER
namespace System.Runtime.CompilerServices
{
    using ComponentModel;

    /// <summary>
    /// Indicates the attributed type is to be used as an interpolated string handler.
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Struct, AllowMultiple = false, Inherited = false)]
    [EditorBrowsable(EditorBrowsableState.Never)]
    internal sealed class InterpolatedStringHandlerAttribute : Attribute
    {
    }

    /// <summary>
    /// Indicates which arguments to a method involving an interpolated string handler should be passed to that handler.
    /// </summary>
    [AttributeUsage(AttributeTargets.Parameter, AllowMultiple = false, Inherited = false)]
    [EditorBrowsable(EditorBrowsableState.Never)]
    internal sealed class InterpolatedStringHandlerArgumentAttribute : Attribute
    {
        public InterpolatedStringHandlerArgumentAttribute(string argument)
        {
            Arguments = new string[] { argument };
        }

        public InterpolatedStringHandlerArgumentAttribute(params string[] arguments)
        {
            Arguments = arguments;
        }

        public string[] Arguments { get; }
    }
}
#endif
