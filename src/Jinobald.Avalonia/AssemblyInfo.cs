using Avalonia.Metadata;

// XAML에서 사용할 네임스페이스 정의
// 사용 예: <Window xmlns:jino="https://github.com/JinoPay/Jinobald">
[assembly: XmlnsDefinition("https://github.com/JinoPay/Jinobald", "Jinobald.Avalonia.Services.Regions")]
[assembly: XmlnsDefinition("https://github.com/JinoPay/Jinobald", "Jinobald.Avalonia.Mvvm")]

// xmlns 접두사를 "jino"로 권장
[assembly: XmlnsPrefix("https://github.com/JinoPay/Jinobald", "jino")]
