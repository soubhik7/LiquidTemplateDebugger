using DotLiquid;
using LiquidTemplateDebugger.Models;

namespace LiquidTemplateDebugger.Engine.Interfaces;

/// <summary>
/// Interface for loading and converting input data from various formats.
/// </summary>
public interface IInputDataLoader
{
    /// <summary>
    /// Load data from a file path.
    /// </summary>
    /// <param name="filePath">Path to the data file.</param>
    /// <returns>Tuple of DotLiquid Hash and origin tracking dictionary.</returns>
    (Hash hash, Dictionary<string, ValueOrigin> origins) LoadFromFile(string filePath);
    
    /// <summary>
    /// Load data from a string with specified format.
    /// </summary>
    /// <param name="content">The data content.</param>
    /// <param name="format">Format type (JSON, XML, CSV, TEXT).</param>
    /// <returns>Tuple of DotLiquid Hash and origin tracking dictionary.</returns>
    (Hash hash, Dictionary<string, ValueOrigin> origins) LoadFromString(string content, string format);
    
    /// <summary>
    /// Get supported input formats.
    /// </summary>
    /// <returns>Collection of supported format names.</returns>
    IEnumerable<string> GetSupportedFormats();
    
    /// <summary>
    /// Detect format from content.
    /// </summary>
    /// <param name="content">The content to analyze.</param>
    /// <returns>Detected format name.</returns>
    string DetectFormat(string content);
}


