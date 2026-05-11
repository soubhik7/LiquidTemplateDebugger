import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Edit3, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AnimatedButton } from '../shared/AnimatedButton';
import { beautifyContent } from '../../utils/helpers';

interface DataPanelProps {
  onApplyEdits: (data: string) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function DataPanel({ onApplyEdits, onToast }: DataPanelProps) {
  const debugState = useAppStore((s) => s.debugState);
  const dataEditMode = useAppStore((s) => s.dataEditMode);
  const setDataEditMode = useAppStore((s) => s.setDataEditMode);

  const [editContent, setEditContent] = useState('');

  const dataContent = debugState?.dataContent ?? '';
  const dataFormat = debugState?.dataFormat ?? 'json';
  const loaded = !!debugState?.isLoaded;

  useEffect(() => {
    if (dataContent) setEditContent(dataContent);
  }, [dataContent]);

  const handleBeautify = useCallback(() => {
    try {
      setEditContent(beautifyContent(editContent, dataFormat));
      onToast(`Formatted as ${dataFormat.toUpperCase()}`, 'success');
    } catch {
      onToast('Failed to beautify', 'error');
    }
  }, [editContent, dataFormat, onToast]);

  const handleApply = useCallback(() => {
    onApplyEdits(editContent);
    setDataEditMode(false);
  }, [editContent, onApplyEdits, setDataEditMode]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-surface)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-primary)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Input Data
        </span>
        {loaded && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            ({dataFormat})
          </span>
        )}
        <div style={{ flex: 1 }} />

        <AnimatedButton
          variant="ghost"
          size="xs"
          icon={<Wand2 size={11} />}
          onClick={handleBeautify}
          disabled={!loaded}
        >
          Beautify
        </AnimatedButton>

        {dataEditMode ? (
          <AnimatedButton variant="primary" size="xs" icon={<Check size={11} />} onClick={handleApply}>
            Apply
          </AnimatedButton>
        ) : (
          <AnimatedButton
            variant="ghost"
            size="xs"
            icon={<Edit3 size={11} />}
            onClick={() => setDataEditMode(true)}
            disabled={!loaded}
          >
            Edit
          </AnimatedButton>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          readOnly={!dataEditMode}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              const s = e.currentTarget.selectionStart;
              const en = e.currentTarget.selectionEnd;
              const v = e.currentTarget.value;
              e.currentTarget.value = v.substring(0, s) + '  ' + v.substring(en);
              e.currentTarget.selectionStart = e.currentTarget.selectionEnd = s + 2;
            }
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            background: dataEditMode ? 'var(--bg-primary)' : 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            lineHeight: 1.6,
            padding: '8px 12px',
            border: 'none',
            outline: 'none',
            resize: 'none',
            tabSize: 2,
            transition: 'background var(--transition-base)',
          }}
          placeholder={loaded ? '' : 'Load a template to see input data…'}
        />
      </div>
    </motion.div>
  );
}
