using LiquidTemplateDebugger.Configuration.Interfaces;
using Microsoft.Extensions.Caching.Distributed;

namespace LiquidTemplateDebugger.Configuration;

/// <summary>
/// Implementation of feature flag service using configuration.
/// </summary>
public class FeatureFlagService : IFeatureFlagService
{
    private readonly IConfiguration _config;
    private readonly ILogger<FeatureFlagService> _logger;
    
    public FeatureFlagService(IConfiguration config, ILogger<FeatureFlagService> logger)
    {
        _config = config;
        _logger = logger;
    }
    
    public bool IsEnabled(string featureName)
    {
        var value = _config.GetValue<bool>($"FeatureFlags:{featureName}");
        _logger.LogDebug("Feature flag {FeatureName} is {Status}", featureName, value ? "enabled" : "disabled");
        return value;
    }
    
    public Task<bool> IsEnabledAsync(string featureName)
    {
        return Task.FromResult(IsEnabled(featureName));
    }
    
    public Task<bool> IsEnabledForUserAsync(string featureName, string userId)
    {
        // For now, same as global check
        // Can be extended to support user-specific flags
        return IsEnabledAsync(featureName);
    }
    
    public Task<Dictionary<string, bool>> GetAllFlagsAsync()
    {
        var flags = new Dictionary<string, bool>();
        var featureFlagsSection = _config.GetSection("FeatureFlags");
        
        foreach (var child in featureFlagsSection.GetChildren())
        {
            flags[child.Key] = child.Get<bool>();
        }
        
        return Task.FromResult(flags);
    }
    
    public Task UpdateFlagAsync(string featureName, bool enabled)
    {
        // Configuration is read-only at runtime
        // This would require a configuration provider that supports writes
        _logger.LogWarning("Feature flag updates are not supported in current configuration provider");
        return Task.CompletedTask;
    }
}

// Made with Bob
