using DryIoc;
using Jinobald.Abstractions.Ioc;

namespace Jinobald.Ioc.DryIoc;

/// <summary>
///     DryIoc 기반 컨테이너 확장
/// </summary>
public sealed class DryIocContainerExtension : IContainerExtension
{
    private readonly IContainer _container;

    public DryIocContainerExtension()
    {
        _container = new Container();
    }

    public DryIocContainerExtension(IContainer container)
    {
        _container = container ?? throw new ArgumentNullException(nameof(container));
    }

    public object Instance => _container;

    #region IContainerProvider Implementation

    public object Resolve(Type serviceType)
    {
        return _container.Resolve(serviceType);
    }

    public T Resolve<T>() where T : notnull
    {
        return _container.Resolve<T>();
    }

    public object Resolve(Type serviceType, string name)
    {
        return _container.Resolve(serviceType, serviceKey: name);
    }

    public T Resolve<T>(string name) where T : notnull
    {
        return _container.Resolve<T>(serviceKey: name);
    }

    public object Resolve(Type serviceType, params (Type Type, object Instance)[] parameters)
    {
        if (parameters.Length > 0)
        {
            var args = parameters.Select(p => p.Instance).ToArray();
            return _container.Resolve(serviceType, args: args);
        }

        return _container.Resolve(serviceType);
    }

    public T Resolve<T>(params (Type Type, object Instance)[] parameters) where T : notnull
    {
        if (parameters.Length > 0)
        {
            var args = parameters.Select(p => p.Instance).ToArray();
            return _container.Resolve<T>(args: args);
        }

        return _container.Resolve<T>();
    }

    #endregion

    #region IContainerRegistry Implementation

    public IContainerRegistry RegisterSingleton(Type from, Type to)
    {
        _container.Register(from, to, Reuse.Singleton);
        return this;
    }

    public IContainerRegistry RegisterSingleton<TFrom, TTo>() where TFrom : class where TTo : class, TFrom
    {
        _container.Register<TFrom, TTo>(Reuse.Singleton);
        return this;
    }

    public IContainerRegistry RegisterSingleton(Type type)
    {
        _container.Register(type, type, Reuse.Singleton);
        return this;
    }

    public IContainerRegistry RegisterSingleton<T>() where T : class
    {
        _container.Register<T>(Reuse.Singleton);
        return this;
    }

    public IContainerRegistry RegisterInstance(Type type, object instance)
    {
        _container.RegisterInstance(type, instance);
        return this;
    }

    public IContainerRegistry RegisterInstance<T>(T instance) where T : class
    {
        _container.RegisterInstance(instance);
        return this;
    }

    public IContainerRegistry Register(Type from, Type to)
    {
        _container.Register(from, to, Reuse.Transient);
        return this;
    }

    public IContainerRegistry Register<TFrom, TTo>() where TFrom : class where TTo : class, TFrom
    {
        _container.Register<TFrom, TTo>(Reuse.Transient);
        return this;
    }

    public IContainerRegistry Register(Type type)
    {
        _container.Register(type, type, Reuse.Transient);
        return this;
    }

    public IContainerRegistry Register<T>() where T : class
    {
        _container.Register<T>(Reuse.Transient);
        return this;
    }

    public IContainerRegistry RegisterScoped(Type from, Type to)
    {
        _container.Register(from, to, Reuse.Scoped);
        return this;
    }

    public IContainerRegistry RegisterScoped<TFrom, TTo>() where TFrom : class where TTo : class, TFrom
    {
        _container.Register<TFrom, TTo>(Reuse.Scoped);
        return this;
    }

    public IContainerRegistry RegisterScoped(Type type)
    {
        _container.Register(type, type, Reuse.Scoped);
        return this;
    }

    public IContainerRegistry RegisterScoped<T>() where T : class
    {
        _container.Register<T>(Reuse.Scoped);
        return this;
    }

    #endregion

    #region IContainerExtension Implementation

    public void FinalizeExtension()
    {
        // DryIoc은 빌드 단계가 필요 없음
        // 컨테이너가 즉시 사용 가능
    }

    public IScopedProvider CreateScope()
    {
        var scope = _container.OpenScope();
        return new DryIocScopedProvider(scope);
    }

    #endregion

    /// <summary>
    ///     DryIoc 기반 스코프 프로바이더
    /// </summary>
    private sealed class DryIocScopedProvider : IScopedProvider
    {
        private readonly IResolverContext _scope;

        public DryIocScopedProvider(IResolverContext scope)
        {
            _scope = scope;
        }

        public object Resolve(Type serviceType)
        {
            return _scope.Resolve(serviceType);
        }

        public T Resolve<T>() where T : notnull
        {
            return _scope.Resolve<T>();
        }

        public object Resolve(Type serviceType, string name)
        {
            return _scope.Resolve(serviceType, serviceKey: name);
        }

        public T Resolve<T>(string name) where T : notnull
        {
            return _scope.Resolve<T>(serviceKey: name);
        }

        public object Resolve(Type serviceType, params (Type Type, object Instance)[] parameters)
        {
            if (parameters.Length > 0)
            {
                var args = parameters.Select(p => p.Instance).ToArray();
                return _scope.Resolve(serviceType, args: args);
            }

            return _scope.Resolve(serviceType);
        }

        public T Resolve<T>(params (Type Type, object Instance)[] parameters) where T : notnull
        {
            if (parameters.Length > 0)
            {
                var args = parameters.Select(p => p.Instance).ToArray();
                return _scope.Resolve<T>(args: args);
            }

            return _scope.Resolve<T>();
        }

        public void Dispose()
        {
            if (_scope is IDisposable disposable)
            {
                disposable.Dispose();
            }
        }
    }
}
