using Jinobald.Core.Services.Dialog;

namespace Jinobald.Core.Tests.Services.Dialog;

public class DialogResultTests
{
    [Fact]
    public void DefaultConstructor_ShouldSetNoneResultAndEmptyParameters()
    {
        // Arrange & Act
        var result = new DialogResult();

        // Assert
        Assert.Equal(ButtonResult.None, result.Result);
        Assert.NotNull(result.Parameters);
    }

    [Fact]
    public void Constructor_WithButtonResult_ShouldSetResult()
    {
        // Arrange & Act
        var result = new DialogResult(ButtonResult.OK);

        // Assert
        Assert.Equal(ButtonResult.OK, result.Result);
        Assert.NotNull(result.Parameters);
    }

    [Fact]
    public void Constructor_WithButtonResultAndParameters_ShouldSetBoth()
    {
        // Arrange
        var parameters = new DialogParameters();
        parameters.Add("returnValue", 42);

        // Act
        var result = new DialogResult(ButtonResult.Yes, parameters);

        // Assert
        Assert.Equal(ButtonResult.Yes, result.Result);
        Assert.Same(parameters, result.Parameters);
        Assert.Equal(42, result.Parameters.GetValue<int>("returnValue"));
    }

    [Fact]
    public void Constructor_WithParametersOnly_ShouldSetNoneResult()
    {
        // Arrange
        var parameters = new DialogParameters();
        parameters.Add("data", "test");

        // Act
        var result = new DialogResult(parameters);

        // Assert
        Assert.Equal(ButtonResult.None, result.Result);
        Assert.Same(parameters, result.Parameters);
    }

    [Theory]
    [InlineData(ButtonResult.None)]
    [InlineData(ButtonResult.OK)]
    [InlineData(ButtonResult.Cancel)]
    [InlineData(ButtonResult.Yes)]
    [InlineData(ButtonResult.No)]
    [InlineData(ButtonResult.Abort)]
    [InlineData(ButtonResult.Retry)]
    [InlineData(ButtonResult.Ignore)]
    public void Constructor_ShouldAcceptAllButtonResults(ButtonResult buttonResult)
    {
        // Arrange & Act
        var result = new DialogResult(buttonResult);

        // Assert
        Assert.Equal(buttonResult, result.Result);
    }
}
