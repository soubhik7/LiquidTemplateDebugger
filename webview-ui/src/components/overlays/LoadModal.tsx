import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Play, Package } from 'lucide-react';
import { AnimatedButton } from '../shared/AnimatedButton';
import { modalOverlay, modalContent } from '../../utils/animation';

interface LoadModalProps {
  open: boolean;
  onClose: () => void;
  onLoad: (template: string, data: string, format: string) => Promise<boolean>;
  onLoadSample: () => void;
  prefillRef: React.MutableRefObject<((tpl: string) => void) | null>;
}

export function LoadModal({ open, onClose, onLoad, onLoadSample, prefillRef }: LoadModalProps) {
  const [template, setTemplate] = useState('');
  const [data, setData] = useState('');
  const [format, setFormat] = useState('json');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wire the prefill ref so the parent can inject a template
  useEffect(() => {
    prefillRef.current = (tpl: string) => setTemplate(tpl);
    return () => { prefillRef.current = null; };
  }, [prefillRef]);

  const handleFiles = useCallback((files: FileList) => {
    for (const f of Array.from(files)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        if (f.name.endsWith('.liquid') || f.name.endsWith('.html')) {
          setTemplate(content);
        } else {
          setData(content);
          if (f.name.endsWith('.xml')) setFormat('xml');
          else if (f.name.endsWith('.json')) setFormat('json');
        }
      };
      reader.readAsText(f);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleLoad = useCallback(async () => {
    if (!template.trim() || !data.trim()) return;
    setLoading(true);
    const ok = await onLoad(template, data, format);
    setLoading(false);
    if (ok) onClose();
  }, [template, data, format, onLoad, onClose]);

  const handleTab = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = e.currentTarget.selectionStart;
      const en = e.currentTarget.selectionEnd;
      const v = e.currentTarget.value;
      e.currentTarget.value = v.substring(0, s) + '  ' + v.substring(en);
      e.currentTarget.selectionStart = e.currentTarget.selectionEnd = s + 2;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={modalOverlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <motion.div
            variants={modalContent}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 680,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-secondary)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '20px 24px 0',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, var(--accent), var(--cyan))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: 4,
                  }}
                >
                  Load Template & Data
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Paste your Liquid template and input data to start debugging
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  padding: 4,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 24px' }}>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-primary)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px 20px',
                  textAlign: 'center',
                  color: dragging ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  marginBottom: 16,
                  background: dragging ? 'var(--accent-soft)' : 'var(--glass-bg)',
                  transition: 'all var(--transition-base)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <Upload size={16} />
                Drop .liquid and .json/.xml files here, or click to browse
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />

              {/* Template */}
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                Template
              </label>
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                onKeyDown={handleTab}
                placeholder={'{% for item in items %}\n  {{ item.name }}\n{% endfor %}'}
                style={{
                  width: '100%',
                  height: 140,
                  resize: 'vertical',
                  marginBottom: 14,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  outline: 'none',
                  transition: 'border-color var(--transition-fast)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
              />

              {/* Data */}
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                Data
              </label>
              <textarea
                value={data}
                onChange={(e) => setData(e.target.value)}
                onKeyDown={handleTab}
                placeholder={'{"items": [{"name": "Widget"}]}'}
                style={{
                  width: '100%',
                  height: 120,
                  resize: 'vertical',
                  marginBottom: 14,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  outline: 'none',
                  transition: 'border-color var(--transition-fast)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
              />

              {/* Format */}
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                Data Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: 13,
                  padding: '7px 10px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              >
                <option value="json">JSON</option>
                <option value="xml">XML</option>
                <option value="text">Key=Value</option>
              </select>
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
                padding: '12px 24px 20px',
                borderTop: '1px solid var(--border-primary)',
              }}
            >
              <AnimatedButton
                variant="ghost"
                size="md"
                icon={<Package size={14} />}
                onClick={onLoadSample}
              >
                Load Sample
              </AnimatedButton>
              <AnimatedButton variant="ghost" size="md" onClick={onClose}>
                Cancel
              </AnimatedButton>
              <AnimatedButton
                variant="primary"
                size="md"
                icon={<Play size={14} />}
                onClick={handleLoad}
                disabled={loading || !template.trim() || !data.trim()}
              >
                {loading ? 'Loading…' : 'Start Debugging'}
              </AnimatedButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
