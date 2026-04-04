using LiquidTemplateDebugger.Models;

namespace LiquidTemplateDebugger.Engine.Interfaces;

/// <summary>
/// Interface for parsing Liquid templates into debuggable elements.
/// </summary>
public interface ITemplateParser
{
    /// <summary>
    /// Parse a Liquid template into a list of debuggable elements.
    /// </summary>
    /// <param name="templateContent">The template content to parse.</param>
    /// <returns>List of template elements.</returns>
    List<TemplateElement> Parse(string templateContent);
    
    /// <summary>
    /// Validate template syntax without full parsing.
    /// </summary>
    /// <param name="templateContent">The template content to validate.</param>
    /// <returns>Validation result indicating success or failure with error message.</returns>
    ValidationResult ValidateSyntax(string templateContent);
    
    /// <summary>
    /// Get line and column information for a character position.
    /// </summary>
    /// <param name="template">The template content.</param>
    /// <param name="charIndex">The character index.</param>
    /// <returns>Tuple of (line, column) numbers (1-based).</returns>
    (int line, int column) GetPosition(string template, int charIndex);
}

// Made with Bob
