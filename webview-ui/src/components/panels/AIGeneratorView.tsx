import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Loader, Wand2, ArrowLeft, RefreshCw, Copy, Check, Play, FileJson, FileCode, FileText, LayoutTemplate, AlertTriangle, FileSpreadsheet, Paperclip } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useDebugger } from '../../hooks/useDebugger';
import { AnimatedButton } from '../shared/AnimatedButton';
import { detectFormat } from '../../utils/helpers';
import { AI_SAMPLES, type AISample } from '../../data/aiSamples';

export function AIGeneratorView() {
  const aiConfig = useAppStore((s) => s.aiConfig);
  const generatorState = useAppStore((s) => s.generatorState);
  const setGeneratorState = useAppStore((s) => s.setGeneratorState);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const addToast = useAppStore((s) => s.addToast);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const { generateAITemplate, loadTemplate } = useDebugger();

  const handleFormatChange = (f: string) => {
    setGeneratorState({ format: f });
  };

  const handleGenerate = async () => {
    const { prompt, data, format, mappingDetails } = generatorState;
    
    if (!prompt.trim()) {
      addToast({
        title: 'Requirements Missing',
        message: 'Please enter what you want the AI to generate.',
        type: 'info',
        duration: 3000
      });
      return;
    }

    if (!aiConfig.enabled) {
      addToast({
        title: 'AI Not Configured',
        message: 'Please go to Settings and validate your Gemini API key.',
        type: 'error',
        duration: 5000
      });
      return;
    }
    
    // Clear previous result and show loading immediately
    setGeneratorState({ generatedTemplate: '', showResult: false });
    setIsGenerating(true);
    try {
      let dataContext = {};
      if (data.trim()) {
        try {
          dataContext = JSON.parse(data);
        } catch {
          dataContext = { raw: data };
        }
      }

      const res = await generateAITemplate(
        prompt,
        aiConfig.defaultModel || 'gemini-1.5-flash',
        dataContext,
        format,
        mappingDetails
      ) as { template?: string; error?: string };

      if (!res) {
        throw new Error('The AI engine did not return a response. Please check your network and API key.');
      }

      if (res.error) {
        throw new Error(res.error);
      }

      if (res.template && res.template.trim()) {
        setGeneratorState({ generatedTemplate: res.template, showResult: true });
        addToast({
          title: 'Template Generated',
          message: 'Liquid template draft is ready for review.',
          type: 'success',
          duration: 3000,
        });
      } else {
        throw new Error('The AI returned an empty template. Try providing more specific requirements.');
      }
    } catch (err: any) {
      console.error('[AIGenerator] Generation error:', err);
      addToast({
        title: 'Generation Failed',
        message: err.message || 'An unexpected error occurred. Please try again.',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const { copyToClipboard } = useDebugger();
  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(generatorState.generatedTemplate);
    if (ok) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }
  }, [generatorState.generatedTemplate, copyToClipboard]);

  const handleStartDebugging = async () => {
    const { generatedTemplate, data, format } = generatorState;
    if (!generatedTemplate || !data) {
        addToast({
            title: 'Missing Data',
            message: 'Please ensure both template and data are present.',
            type: 'info',
            duration: 3000
        });
        return;
    }
    const ok = await loadTemplate(generatedTemplate, data, format);
    if (ok) {
      addToast({
        title: 'Ready',
        message: 'Template loaded into debugger.',
        type: 'success',
        duration: 3000,
      });
    }
  };

  const handleSelectSample = (s: AISample) => {
    setGeneratorState({
        prompt: s.prompt,
        data: s.data,
        format: s.format,
        generatedTemplate: '',
        showResult: false
    });
    addToast({
        title: 'Sample Loaded',
        message: `Prompt for "${s.name}" applied.`,
        type: 'info',
        duration: 2000
    });
  };

  const handleResetAll = () => {
    setGeneratorState({
      prompt: '',
      data: '',
      format: 'json',
      mappingDetails: '',
      generatedTemplate: '',
      showResult: false
    });
    addToast({
      title: 'Reset Complete',
      message: 'All inputs and results have been cleared.',
      type: 'info',
      duration: 2000
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setGeneratorState({ mappingDetails: content });
      addToast({
        title: 'File Attached',
        message: `Content from "${file.name}" imported to mapping details.`,
        type: 'success',
        duration: 3000
      });
    };
    reader.onerror = () => {
      addToast({
        title: 'Error',
        message: 'Failed to read the file. Please ensure it is a text-based file.',
        type: 'error',
        duration: 5000
      });
    };
    reader.readAsText(file);
  };

  const getFormatIcon = (f: string) => {
    switch (f) {
      case 'json': return <FileJson size={14} style={{ color: 'var(--blue)' }} />;
      case 'xml': return <FileCode size={14} style={{ color: 'var(--orange)' }} />;
      case 'text': return <FileText size={14} style={{ color: 'var(--green)' }} />;
      default: return <LayoutTemplate size={14} />;
    }
  };

  if (!aiConfig.enabled) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        padding: '60px 40px',
        overflowY: 'auto',
        background: 'var(--bg-primary)'
      }}>
        {/* Hero Section */}
        <div style={{ 
            width: 80, 
            height: 80, 
            borderRadius: 24, 
            background: 'var(--accent-soft)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: 24,
            color: 'var(--accent)',
            boxShadow: '0 8px 16px var(--accent-glow)'
        }}>
            <Brain size={40} strokeWidth={2.5} />
        </div>
        
        <h2 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.5px' }}>
          AI-Powered Liquid Generation
        </h2>
        
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.6, marginBottom: 40, textAlign: 'center' }}>
          Unlock the full potential of Liquid template engineering. Build complex mapping logic for Azure Logic Apps using natural language and enterprise-grade AI models.
        </p>

        {/* Setup Guide */}
        <div style={{ 
          width: '100%', 
          maxWidth: 900, 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 24, 
          marginBottom: 48,
          textAlign: 'left'
        }}>
          {/* Step 1: API Key */}
          <div style={{ 
            padding: 24, 
            background: 'var(--bg-surface)', 
            borderRadius: 20, 
            border: '1px solid var(--border-primary)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>1</div>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Get Gemini API Key</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Visit the <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Google AI Studio</a> to generate a free API key for Gemini. This key enables the generator to analyze your requirements.
            </p>
          </div>

          {/* Step 2: Configure */}
          <div style={{ 
            padding: 24, 
            background: 'var(--bg-surface)', 
            borderRadius: 20, 
            border: '1px solid var(--border-primary)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>2</div>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Configure Settings</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Click the button below to navigate to <strong>Settings</strong>. Paste your API key and ensure <strong>AI Features</strong> are toggled ON.
            </p>
          </div>
        </div>

        {/* How it Works Header */}
        <h3 style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 24 }}>
          How to use the generator
        </h3>

        {/* Feature Grid */}
        <div style={{ 
          width: '100%', 
          maxWidth: 900, 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: 20, 
          marginBottom: 56,
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: 'var(--accent)', display: 'flex', marginBottom: 4 }}><Wand2 size={20} /></div>
            <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>Requirements</h4>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>Describe your goal in plain English (e.g., "Flatten this JSON and format dates").</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: 'var(--purple)', display: 'flex', marginBottom: 4 }}><FileSpreadsheet size={20} /></div>
            <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>Business Mapping</h4>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>Import logic from Excel or Word to provide strict mapping rules for the AI.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ color: 'var(--green)', display: 'flex', marginBottom: 4 }}><FileJson size={20} /></div>
            <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>Context Data</h4>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>Provide a sample JSON or XML payload so the AI understands your data structure.</p>
          </div>
        </div>

        <AnimatedButton 
          variant="primary" 
          size="lg" 
          onClick={() => setActiveView('settings')}
          style={{ padding: '0 40px', height: 56, fontSize: 16, fontWeight: 800 }}
          icon={<Sparkles size={20} />}
        >
          Finish Setup in Settings
        </AnimatedButton>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '24px 32px', 
        borderBottom: '1px solid var(--border-primary)',
        background: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            borderRadius: 14, 
            background: 'var(--accent-soft)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--accent)'
          }}>
            <Sparkles size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>AI Template Generator</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>Build complex mapping logic with natural language</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <AnimatedButton variant="ghost" size="md" onClick={handleResetAll} icon={<RefreshCw size={16} />}>
            Reset All
          </AnimatedButton>
          <AnimatedButton variant="ghost" size="md" onClick={() => setActiveView('debugger')} icon={<ArrowLeft size={16} />}>
            Back to Debugger
          </AnimatedButton>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Column: Input */}
        <div style={{ 
          flex: '1 1 50%', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '32px',
          borderRight: '1px solid var(--border-primary)',
          overflowY: 'auto',
          background: 'var(--bg-primary)'
        }}>
          {/* Quick Samples */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <LayoutTemplate size={18} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Try a Sample</h3>
            </div>
            <div style={{ 
                display: 'flex', 
                gap: 12, 
                overflowX: 'auto', 
                paddingBottom: 12,
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
            }}>
                {AI_SAMPLES.map((s) => (
                    <motion.button
                        key={s.name}
                        whileHover={{ scale: 1.02, background: 'var(--bg-hover)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectSample(s)}
                        style={{
                            flexShrink: 0,
                            width: 160,
                            padding: '14px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            boxShadow: 'var(--shadow-sm)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>{s.name}</span>
                            {getFormatIcon(s.format)}
                        </div>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4, height: 42, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                            {s.prompt}
                        </p>
                    </motion.button>
                ))}
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileSpreadsheet size={18} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Business Mapping (Optional)</h3>
              </div>
              <input 
                type="file" 
                ref={inputRef} 
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
                accept=".txt,.csv,.json,.md,.html,.xml"
              />
              <AnimatedButton 
                variant="ghost" 
                size="sm" 
                icon={<Paperclip size={14} />} 
                onClick={() => inputRef.current?.click()}
              >
                Attach Doc
              </AnimatedButton>
            </div>
            <textarea
              value={generatorState.mappingDetails}
              onChange={(e) => setGeneratorState({ mappingDetails: e.target.value })}
              placeholder="Paste mapping details from Excel/Word here, or attach a document... (e.g., 'Source Field A -> Target Property B')"
              style={{
                width: '100%',
                height: 100,
                padding: '16px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                lineHeight: 1.5,
                outline: 'none',
                resize: 'none',
                transition: 'border-color 0.2s',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-primary)')}
            />
          </div>

          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Wand2 size={18} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Requirements</h3>
            </div>
            <textarea
              value={generatorState.prompt}
              onChange={(e) => setGeneratorState({ prompt: e.target.value })}
              placeholder="e.g., Extract user profile, calculate total price with tax, and format all dates to YYYY-MM-DD..."
              style={{
                width: '100%',
                height: 120,
                padding: '16px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontFamily: 'var(--font-sans)',
                lineHeight: 1.6,
                outline: 'none',
                resize: 'none',
                transition: 'border-color 0.2s',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-primary)')}
            />
          </div>

          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileJson size={18} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Context Data</h3>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['json', 'xml', 'text'].map((f) => (
                  <button
                    key={f}
                    onClick={() => handleFormatChange(f)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 6,
                      background: generatorState.format === f ? 'var(--accent-soft)' : 'var(--bg-hover)',
                      color: generatorState.format === f ? 'var(--accent)' : 'var(--text-muted)',
                      border: `1px solid ${generatorState.format === f ? 'var(--accent)' : 'var(--border-primary)'}`,
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s'
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={generatorState.data}
              onChange={(e) => setGeneratorState({ data: e.target.value })}
              placeholder={generatorState.format === 'json' ? '{"user": {"name": "John"}}' : 'Data for the AI to analyze...'}
              style={{
                width: '100%',
                height: 200,
                padding: '16px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.6,
                outline: 'none',
                resize: 'none',
                transition: 'border-color 0.2s',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-primary)')}
            />
          </div>

          <AnimatedButton
            variant="primary"
            size="lg"
            onClick={handleGenerate}
            disabled={isGenerating || !generatorState.prompt.trim()}
            style={{ width: '100%', height: 56, fontSize: 16, fontWeight: 800 }}
            icon={isGenerating ? <Loader size={20} className="spin" /> : <Sparkles size={20} />}
          >
            {isGenerating ? 'AI is Processing...' : 'Generate Template'}
          </AnimatedButton>
        </div>

        {/* Right Column: Result */}
        <div style={{ 
          flex: '1 1 50%', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '32px',
          background: 'var(--bg-surface)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <AnimatePresence>
            {isGenerating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-xl)',
                  border: '1px solid var(--accent-soft)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Shimmer Effect */}
                <motion.div
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2,
                    ease: "linear",
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.05), transparent)',
                    pointerEvents: 'none'
                  }}
                />

                <div style={{ position: 'relative' }}>
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                    }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      filter: 'blur(40px)',
                      zIndex: 0
                    }}
                  />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <Brain size={64} style={{ color: 'var(--accent)', filter: 'drop-shadow(0 0 10px var(--accent-soft))' }} />
                  </div>
                </div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  style={{ textAlign: 'center', marginTop: 32, zIndex: 1 }}
                >
                  <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8, background: 'linear-gradient(to right, var(--accent), var(--purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    AI is Thinking...
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                    Crafting your Liquid template for Logic Apps
                  </p>
                </motion.div>

                <div style={{ display: 'flex', gap: 6, marginTop: 24, zIndex: 1 }}>
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.3, 1, 0.3],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        delay: i * 0.2,
                      }}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            ) : !generatorState.showResult ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  opacity: 0.5,
                  border: '2px dashed var(--border-primary)',
                  borderRadius: 'var(--radius-xl)'
                }}
              >
                <Brain size={48} style={{ marginBottom: 16 }} />
                <p style={{ fontSize: 15, fontWeight: 600 }}>Your generated template will appear here</p>
              </motion.div>
            ) : (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      <Check size={18} />
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Liquid Template Output</h3>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <AnimatedButton variant="ghost" size="sm" onClick={handleCopy} icon={isCopied ? <Check size={14} /> : <Copy size={14} />}>
                      {isCopied ? 'Copied' : 'Copy'}
                    </AnimatedButton>
                    <AnimatedButton variant="ghost" size="sm" onClick={() => setGeneratorState({ showResult: false, generatedTemplate: '' })} icon={<RefreshCw size={14} />}>
                      New
                    </AnimatedButton>
                  </div>
                </div>

                <div style={{ 
                  flex: 1, 
                  background: 'var(--bg-primary)', 
                  border: '1px solid var(--border-primary)', 
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.7,
                  boxShadow: 'var(--shadow-md)'
                }}>
                  {generatorState.generatedTemplate}
                </div>

                <div style={{ marginTop: 24, padding: '20px', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', display: 'flex', gap: 16, alignItems: 'center' }}>
                  <AlertTriangle size={24} style={{ color: 'var(--yellow)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px 0' }}>Review Template</p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Verify the logic before starting debugging. AI can sometimes make mistakes.</p>
                  </div>
                  <AnimatedButton 
                      variant="primary" 
                      size="md" 
                      onClick={handleStartDebugging}
                      icon={<Play size={16} />}
                  >
                      Debug Now
                  </AnimatedButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
