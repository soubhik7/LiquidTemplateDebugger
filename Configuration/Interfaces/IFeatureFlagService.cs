namespace LiquidTemplateDebugger.Configuration.Interfaces;

/// <summary>
/// Interface for feature flag management.
/// </summary>
public interface IFeatureFlagService
{
    /// <summary>
    /// Check if a feature is enabled.
    /// </summary>
    /// <param name="featureName">Name of the feature flag.</param>
    /// <returns>True if enabled, false otherwise.</returns>
    bool IsEnabled(string featureName);
    
    /// <summary>
    /// Check if a feature is enabled asynchronously.
    /// </summary>
    /// <param name="featureName">Name of the feature flag.</param>
    /// <returns>Task returning true if enabled, false otherwise.</returns>
    Task<bool> IsEnabledAsync(string featureName);
    
    /// <summary>
    /// Check if a feature is enabled for a specific user.
    /// </summary>
    /// <param name="featureName">Name of the feature flag.</param>
    /// <param name="userId">User identifier.</param>
    /// <returns>Task returning true if enabled for user, false otherwise.</returns>
    Task<bool> IsEnabledForUserAsync(string featureName, string userId);
    
    /// <summary>
    /// Get all feature flags and their states.
    /// </summary>
    /// <returns>Dictionary of feature names and their enabled states.</returns>
    Task<Dictionary<string, bool>> GetAllFlagsAsync();
    
    /// <summary>
    /// Update a feature flag state.
    /// </summary>
    /// <param name="featureName">Name of the feature flag.</param>
    /// <param name="enabled">New enabled state.</param>
    Task UpdateFlagAsync(string featureName, bool enabled);
}

// Made with Bob
