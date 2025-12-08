// Licensed to the .NET Foundation under one or more agreements.
// Polyfill for required members (C# 11+)

#if !NET7_0_OR_GREATER

namespace System.Runtime.CompilerServices
{
    using ComponentModel;

    /// <summary>
    /// Specifies that a type has required members or that a member is required.
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Struct | AttributeTargets.Field | AttributeTargets.Property, AllowMultiple = false, Inherited = false)]
    [EditorBrowsable(EditorBrowsableState.Never)]
    public sealed class RequiredMemberAttribute : Attribute
    {
    }

    /// <summary>
    /// Indicates that compiler support for a particular feature is required for the location where this attribute is applied.
    /// </summary>
    [AttributeUsage(AttributeTargets.All, AllowMultiple = true, Inherited = false)]
    [EditorBrowsable(EditorBrowsableState.Never)]
    public sealed class CompilerFeatureRequiredAttribute : Attribute
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="CompilerFeatureRequiredAttribute"/> class.
        /// </summary>
        /// <param name="featureName">The name of the required compiler feature.</param>
        public CompilerFeatureRequiredAttribute(string featureName)
        {
            FeatureName = featureName;
        }

        /// <summary>
        /// Gets the name of the compiler feature.
        /// </summary>
        public string FeatureName { get; }

        /// <summary>
        /// Gets or sets a value indicating whether the compiler can choose to allow access to the location where this attribute is applied
        /// if it does not understand <see cref="FeatureName"/>.
        /// </summary>
        public bool IsOptional { get; init; }
    }
}

namespace System.Diagnostics.CodeAnalysis
{
    using ComponentModel;

    /// <summary>
    /// Specifies that this constructor sets all required members for the current type,
    /// and callers do not need to set any required members themselves.
    /// </summary>
    [AttributeUsage(AttributeTargets.Constructor, AllowMultiple = false, Inherited = false)]
    [EditorBrowsable(EditorBrowsableState.Never)]
    public sealed class SetsRequiredMembersAttribute : Attribute
    {
    }
}

#endif
