// Licensed to the .NET Foundation under one or more agreements.
// Polyfill for collection builder attribute (C# 12 collection expressions)

#if !NET8_0_OR_GREATER
namespace System.Runtime.CompilerServices
{
    using ComponentModel;

    /// <summary>
    /// Indicates the type of the builder used to construct the attributed collection type.
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Struct | AttributeTargets.Interface, Inherited = false)]
    [EditorBrowsable(EditorBrowsableState.Never)]
    internal sealed class CollectionBuilderAttribute : Attribute
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="CollectionBuilderAttribute"/> class.
        /// </summary>
        /// <param name="builderType">The type of the builder.</param>
        /// <param name="methodName">The name of the method on the builder type to use to construct an instance of the collection.</param>
        public CollectionBuilderAttribute(Type builderType, string methodName)
        {
            BuilderType = builderType;
            MethodName = methodName;
        }

        /// <summary>
        /// Gets the type of the builder.
        /// </summary>
        public Type BuilderType { get; }

        /// <summary>
        /// Gets the name of the method on the builder type to use to construct an instance of the collection.
        /// </summary>
        public string MethodName { get; }
    }
}
#endif
