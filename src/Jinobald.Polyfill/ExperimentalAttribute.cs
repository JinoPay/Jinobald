// Licensed to the .NET Foundation under one or more agreements.
// Polyfill for experimental attribute

#if !NET8_0_OR_GREATER
namespace System.Diagnostics.CodeAnalysis
{
    using ComponentModel;

    /// <summary>
    /// Indicates that an API is experimental and may change or be removed in future versions.
    /// </summary>
    [AttributeUsage(AttributeTargets.Assembly | AttributeTargets.Module | AttributeTargets.Class | AttributeTargets.Struct | AttributeTargets.Enum | AttributeTargets.Constructor | AttributeTargets.Method | AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Event | AttributeTargets.Interface | AttributeTargets.Delegate, Inherited = false)]
    [EditorBrowsable(EditorBrowsableState.Never)]
    internal sealed class ExperimentalAttribute : Attribute
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ExperimentalAttribute"/> class.
        /// </summary>
        /// <param name="diagnosticId">The diagnostic ID that will be reported when using the experimental API.</param>
        public ExperimentalAttribute(string diagnosticId)
        {
            DiagnosticId = diagnosticId;
        }

        /// <summary>
        /// Gets the diagnostic ID that will be reported when using the experimental API.
        /// </summary>
        public string DiagnosticId { get; }

        /// <summary>
        /// Gets or sets the URL for corresponding documentation.
        /// </summary>
        public string? UrlFormat { get; set; }
    }
}
#endif
