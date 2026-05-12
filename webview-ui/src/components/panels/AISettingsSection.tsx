import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Sparkles, Key, CheckCircle, XCircle, Loader, Brain, Shield, AlertTriangle } from 'lucide-react';
import { AnimatedButton } from '../shared/AnimatedButton';

const GEMINI_MODELS = [
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Fast & Efficient)' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Most Capable)' },
  { value: 'gemini-pro', label: 'Gemini Pro (Balanced)' },
];

export function AISettingsSection() {
  const aiConfig = useAppStore((s) => s.aiConfig);
  const setAIConfig = useAppStore((s) => s.setAIConfig);
  const addToast = useAppStore((s) => s.addToast);

  const [apiKey, setApiKey] = useState(aiConfig.apiKey || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setApiKey(aiConfig.apiKey || '');
  }, [aiConfig.apiKey]);

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
      const response = await fetch('/api/ai/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await response.json();

      if (data.isValid) {
        setValidationStatus('valid');
        setAIConfig({ apiKey: apiKey.trim(), enabled: true });
        addToast({
          title: 'Success',
          message: 'API key validated successfully!',
          type: 'success',
          duration: 3000,
        });
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

  return (
    <section style={{ marginBottom: 64 }}>
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
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
          border: '1px solid var(--accent-soft)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 24,
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        <Brain size={20} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
            Generate Liquid templates using Google Gemini AI
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
            Provide sample input data and expected output, and AI will generate a Liquid template for you.
            Your data is sanitized before being sent to protect sensitive information.
          </p>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div
        style={{
          padding: '20px',
          background: 'var(--bg-hover)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: aiConfig.enabled ? 'var(--accent)' : 'var(--bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: aiConfig.enabled ? 'white' : 'var(--text-muted)',
                transition: 'all 0.3s',
              }}
            >
              <Sparkles size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                AI Features {aiConfig.enabled ? 'Enabled' : 'Disabled'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {aiConfig.enabled ? 'Template generation is active' : 'Configure API key to enable'}
              </div>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleAI}
            style={{
              width: 56,
              height: 32,
              borderRadius: 16,
              background: aiConfig.enabled ? 'var(--accent)' : 'var(--bg-surface)',
              border: '2px solid',
              borderColor: aiConfig.enabled ? 'var(--accent)' : 'var(--border-primary)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.3s',
            }}
          >
            <motion.div
              animate={{ x: aiConfig.enabled ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: 2,
                left: 2,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            />
          </motion.button>
        </div>
      </div>

      {/* API Key Configuration */}
      <div
        style={{
          padding: '24px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Key size={18} style={{ color: 'var(--accent)' }} />
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Gemini API Key
          </h3>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key..."
              style={{
                width: '100%',
                padding: '12px 16px',
                paddingRight: '120px',
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontFamily: 'monospace',
                outline: 'none',
                transition: 'border-color 0.2s',
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
                padding: '6px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-primary)',
                borderRadius: 6,
                color: 'var(--text-secondary)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-surface)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>

          {validationStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: 12,
                padding: '10px 14px',
                background: validationStatus === 'valid' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: '1px solid',
                borderColor: validationStatus === 'valid' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              {validationStatus === 'valid' ? (
                <CheckCircle size={16} style={{ color: '#22c55e' }} />
              ) : (
                <XCircle size={16} style={{ color: '#ef4444' }} />
              )}
              <span style={{ fontSize: 13, fontWeight: 600, color: validationStatus === 'valid' ? '#22c55e' : '#ef4444' }}>
                {validationStatus === 'valid' ? 'API key is valid and ready to use' : 'API key validation failed'}
              </span>
            </motion.div>
          )}
        </div>

        <AnimatedButton
          variant="primary"
          size="md"
          icon={isValidating ? <Loader size={16} className="spin" /> : <CheckCircle size={16} />}
          onClick={handleValidateKey}
          disabled={isValidating || !apiKey.trim()}
          style={{ width: '100%', fontWeight: 800 }}
        >
          {isValidating ? 'Validating...' : 'Validate API Key'}
        </AnimatedButton>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.6 }}>
          Get your free API key from{' '}
          <a
            href="https://makersuite.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}
          >
            Google AI Studio
          </a>
        </p>
      </div>

      {/* Model Selection */}
      <div
        style={{
          padding: '24px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Brain size={18} style={{ color: 'var(--accent)' }} />
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            AI Model
          </h3>
        </div>

        <select
          value={aiConfig.defaultModel}
          onChange={(e) => setAIConfig({ defaultModel: e.target.value })}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {GEMINI_MODELS.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>

      {/* Privacy & Security */}
      <div
        style={{
          padding: '20px',
          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(249, 115, 22, 0.1))',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <Shield size={20} style={{ color: '#eab308', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
              Privacy & Security
            </p>
            <ul style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Your API key is stored locally in your browser</li>
              <li>Sensitive data is automatically detected and redacted before sending to AI</li>
              <li>You can review what data will be sent before generation</li>
              <li>No data is stored on external servers beyond the AI request</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Made with Bob
