import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Sparkles, Key, CheckCircle, XCircle, Loader, Brain, Shield, AlertTriangle, Monitor } from 'lucide-react';
import { AnimatedButton } from '../shared/AnimatedButton';
import { useDebugger } from '../../hooks/useDebugger';

export function AISettingsSection() {
  const aiConfig = useAppStore((s) => s.aiConfig);
  const setAIConfig = useAppStore((s) => s.setAIConfig);
  const addToast = useAppStore((s) => s.addToast);
  const { validateAIKey, listAIModels } = useDebugger();

  const [apiKey, setApiKey] = useState(aiConfig.apiKey || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [showKey, setShowKey] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    setApiKey(aiConfig.apiKey || '');
  }, [aiConfig.apiKey]);

  const fetchModels = async (key: string) => {
    setIsLoadingModels(true);
    try {
      const { models } = await listAIModels(key);
      if (models && models.length > 0) {
        setAvailableModels(models);
        
        // Prioritize 'flash' models for the best default experience
        const flashModel = models.find(m => m.toLowerCase().includes('flash') && m.includes('3'));
        const anyFlashModel = models.find(m => m.toLowerCase().includes('flash'));
        const preferredModel = flashModel || anyFlashModel || models[0];

        if (!models.includes(aiConfig.defaultModel || '')) {
            setAIConfig({ defaultModel: preferredModel });
        }
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    if (aiConfig.apiKey) {
      fetchModels(aiConfig.apiKey);
    }
  }, []);

  const handleValidateKey = async () => {
    if (!apiKey.trim()) {
      addToast({
        title: 'Validation Error',
        message: 'Please enter an API key',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    setIsValidating(true);
    setValidationStatus('idle');

    try {
      const data = await validateAIKey(apiKey.trim());

      if (data.isValid) {
        setValidationStatus('valid');
        setAIConfig({ apiKey: apiKey.trim(), enabled: true });
        addToast({
          title: 'Success',
          message: 'API key validated successfully!',
          type: 'success',
          duration: 3000,
        });
        await fetchModels(apiKey.trim());
      } else {
        setValidationStatus('invalid');
        addToast({
          title: 'Validation Failed',
          message: data.errorMessage || 'Invalid API key',
          type: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      setValidationStatus('invalid');
      addToast({
        title: 'Connection Error',
        message: 'Failed to validate API key. Check your connection.',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleToggleAI = () => {
    if (!aiConfig.enabled && !aiConfig.apiKey) {
      addToast({
        title: 'Setup Required',
        message: 'Please configure and validate your API key first',
        type: 'info',
        duration: 4000,
      });
      return;
    }
    setAIConfig({ enabled: !aiConfig.enabled });
  };

  const formatModelName = (name: string) => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ marginBottom: 64 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ color: 'var(--accent)' }}>
          <Sparkles size={20} strokeWidth={2.5} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>
          AI Template Generation
        </h2>
      </div>

      {/* Info Banner */}
      <div
        style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.08))',
          border: '1px solid var(--accent-soft)',
          borderRadius: 'var(--radius-xl)',
          marginBottom: 32,
          display: 'flex',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
          <Brain size={22} strokeWidth={2.5} />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
            Powered by Gemini AI
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>
            Automate Liquid template generation with high-fidelity reasoning.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        {/* Enable/Disable & API Key in a split view or single stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              padding: '24px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: aiConfig.enabled ? 'var(--accent)' : 'var(--bg-panel)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: aiConfig.enabled ? 'white' : 'var(--text-muted)',
                    transition: 'all 0.3s',
                  }}
                >
                  <Sparkles size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                    AI Assistance
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                    {aiConfig.enabled ? 'Active and ready' : 'Currently inactive'}
                  </div>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleAI}
                style={{
                  width: 48,
                  height: 26,
                  borderRadius: 13,
                  background: aiConfig.enabled ? 'var(--accent)' : 'var(--bg-panel)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: 0,
                  boxShadow: aiConfig.enabled ? '0 0 12px var(--accent-glow)' : 'none',
                  transition: 'background 0.3s'
                }}
              >
                {aiConfig.enabled && (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                      position: 'absolute',
                      inset: -4,
                      borderRadius: 16,
                      background: 'var(--accent)',
                      zIndex: -1,
                      filter: 'blur(8px)'
                    }}
                  />
                )}
                <motion.div
                  animate={{ x: aiConfig.enabled ? 24 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: 2,
                    left: 0,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                />
              </motion.button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Key size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-secondary)' }}>API Configuration</span>
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter Gemini API key..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    paddingRight: '60px',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 10,
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border-primary)')}
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                    padding: '4px 8px'
                  }}
                >
                  {showKey ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              <AnimatedButton
                variant="primary"
                size="sm"
                onClick={handleValidateKey}
                disabled={isValidating || !apiKey.trim()}
                style={{ height: 42, padding: '0 20px', fontSize: 13, fontWeight: 800 }}
              >
                {isValidating ? <Loader size={16} className="spin" /> : 'Validate'}
              </AnimatedButton>
            </div>

            {validationStatus !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: 16,
                  padding: '10px 14px',
                  background: validationStatus === 'valid' ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid',
                  borderColor: validationStatus === 'valid' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                {validationStatus === 'valid' ? (
                  <CheckCircle size={14} style={{ color: '#22c55e' }} />
                ) : (
                  <XCircle size={14} style={{ color: '#ef4444' }} />
                )}
                <span style={{ fontSize: 12, fontWeight: 700, color: validationStatus === 'valid' ? '#22c55e' : '#ef4444' }}>
                  {validationStatus === 'valid' ? 'Key verified successfully' : 'Verification failed'}
                </span>
              </motion.div>
            )}
          </div>

          {/* Model Selection */}
          <div
            style={{
              padding: '24px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Brain size={16} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Active Logic Model
              </h3>
            </div>

            <div style={{ position: 'relative' }}>
              <select
                value={aiConfig.defaultModel}
                onChange={(e) => setAIConfig({ defaultModel: e.target.value })}
                disabled={isLoadingModels || availableModels.length === 0}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 12,
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: (isLoadingModels || availableModels.length === 0) ? 'not-allowed' : 'pointer',
                  appearance: 'none',
                  outline: 'none',
                }}
              >
                {isLoadingModels ? (
                  <option>Retrieving models...</option>
                ) : availableModels.length === 0 ? (
                  <option>No models available</option>
                ) : (
                  availableModels.map((model) => (
                    <option key={model} value={model}>
                      {formatModelName(model)}
                    </option>
                  ))
                )}
              </select>
              <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                {isLoadingModels ? <Loader size={14} className="spin" /> : <Monitor size={14} />}
              </div>
            </div>
            
            {availableModels.length > 0 && !isLoadingModels && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <CheckCircle size={12} style={{ color: '#22c55e' }} />
                    {availableModels.length} compatible engines found
                </p>
            )}
          </div>
        </div>

        {/* Privacy & Tips */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          <div
            style={{
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(59, 130, 246, 0.05))',
              border: '1px solid rgba(34, 197, 94, 0.15)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Shield size={18} style={{ color: '#22c55e', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                  Enterprise Privacy
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
                  Keys are stored locally. Data is sanitized before transmission to ensure no sensitive leakage.
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.05), rgba(249, 115, 24, 0.05))',
              border: '1px solid rgba(234, 179, 8, 0.15)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <AlertTriangle size={18} style={{ color: '#eab308', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                  Pro Tip
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
                  Use "Gemini 1.5 Flash" for the fastest generation speeds with high accuracy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Made with Bob
