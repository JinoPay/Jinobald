using System.Text.Json;

namespace Jinobald.Settings;

/// <summary>
///     JSON 파일 기반 Strongly-Typed 설정 서비스 구현
/// </summary>
/// <typeparam name="TSettings">설정 POCO 클래스 타입</typeparam>
public class JsonTypedSettingsService<TSettings> : ITypedSettingsService<TSettings>
    where TSettings : class, new()
{
    private readonly string _filePath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly JsonSerializerOptions _jsonOptions;
    private TSettings _currentSettings;
    private bool _disposed;

    /// <summary>
    ///     JsonTypedSettingsService를 초기화합니다.
    /// </summary>
    /// <param name="filePath">설정 파일 경로. 지정하지 않으면 기본 경로 사용</param>
    public JsonTypedSettingsService(string? filePath = null)
    {
        _filePath = filePath ?? GetDefaultFilePath();
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        };

        // 파일이 존재하면 로드, 없으면 기본값 사용
        _currentSettings = LoadFromFileOrDefault();
    }

    /// <inheritdoc />
    public TSettings Value
    {
        get
        {
            ObjectDisposedException.ThrowIf(_disposed, this);
            return _currentSettings;
        }
    }

    /// <inheritdoc />
    public event Action<TSettings>? SettingsChanged;

    /// <inheritdoc />
    public void Update(Action<TSettings> updateAction)
    {
        ArgumentNullException.ThrowIfNull(updateAction);
        ObjectDisposedException.ThrowIf(_disposed, this);

        _lock.Wait();
        try
        {
            updateAction(_currentSettings);
            SaveToFileSync();
            SettingsChanged?.Invoke(_currentSettings);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc />
    public async Task UpdateAsync(Func<TSettings, Task> updateAction)
    {
        ArgumentNullException.ThrowIfNull(updateAction);
        ObjectDisposedException.ThrowIf(_disposed, this);

        await _lock.WaitAsync().ConfigureAwait(false);
        try
        {
            await updateAction(_currentSettings).ConfigureAwait(false);
            await SaveToFileAsync().ConfigureAwait(false);
            SettingsChanged?.Invoke(_currentSettings);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc />
    public void Reset()
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        _lock.Wait();
        try
        {
            _currentSettings = new TSettings();
            SaveToFileSync();
            SettingsChanged?.Invoke(_currentSettings);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc />
    public async Task SaveAsync()
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        await _lock.WaitAsync().ConfigureAwait(false);
        try
        {
            await SaveToFileAsync().ConfigureAwait(false);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc />
    public async Task ReloadAsync()
    {
        ObjectDisposedException.ThrowIf(_disposed, this);

        await _lock.WaitAsync().ConfigureAwait(false);
        try
        {
            _currentSettings = LoadFromFileOrDefault();
            SettingsChanged?.Invoke(_currentSettings);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <inheritdoc />
    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;
        _lock.Dispose();
        GC.SuppressFinalize(this);
    }

    #region Private Methods

    private static string GetDefaultFilePath()
    {
        var appDataPath = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var appFolder = Path.Combine(appDataPath, "Jinobald");
        Directory.CreateDirectory(appFolder);

        var typeName = typeof(TSettings).Name;
        return Path.Combine(appFolder, $"{typeName}.json");
    }

    private TSettings LoadFromFileOrDefault()
    {
        if (!File.Exists(_filePath))
            return new TSettings();

        try
        {
            var json = File.ReadAllText(_filePath);
            return JsonSerializer.Deserialize<TSettings>(json, _jsonOptions) ?? new TSettings();
        }
        catch
        {
            // 파일이 손상되었거나 파싱 실패 시 기본값 반환
            return new TSettings();
        }
    }

    private void SaveToFileSync()
    {
        try
        {
            var directory = Path.GetDirectoryName(_filePath);
            if (!string.IsNullOrEmpty(directory))
                Directory.CreateDirectory(directory);

            var json = JsonSerializer.Serialize(_currentSettings, _jsonOptions);
            File.WriteAllText(_filePath, json);
        }
        catch
        {
            // 저장 실패는 무시 (로깅 추가 가능)
        }
    }

    private async Task SaveToFileAsync()
    {
        try
        {
            var directory = Path.GetDirectoryName(_filePath);
            if (!string.IsNullOrEmpty(directory))
                Directory.CreateDirectory(directory);

            var json = JsonSerializer.Serialize(_currentSettings, _jsonOptions);
            await File.WriteAllTextAsync(_filePath, json).ConfigureAwait(false);
        }
        catch
        {
            // 저장 실패는 무시 (로깅 추가 가능)
        }
    }

    #endregion
}
