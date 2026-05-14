import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Edit3, Check, ListTree, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AnimatedButton } from '../shared/AnimatedButton';
import { TreeView } from '../shared/TreeView';
import { beautifyContent, tryParseJson, xmlToJson, detectFormat } from '../../utils/helpers';

interface DataPanelProps {
  onApplyEdits: (data: string) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function DataPanel({ onApplyEdits, onToast }: DataPanelProps) {
  const debugState = useAppStore((s) => s.debugState);
  const dataEditMode = useAppStore((s) => s.dataEditMode);
  const setDataEditMode = useAppStore((s) => s.setDataEditMode);

  const [editContent, setEditContent] = useState('');
  const [showTree, setShowTree] = useState(false);

  const dataContent = debugState?.dataContent ?? '';
  const dataFormat = debugState?.dataFormat ?? 'json';
  const loaded = !!debugState?.isLoaded;

  useEffect(() => {
    if (dataContent) setEditContent(dataContent);
  }, [dataContent]);

  const treeData = useMemo(() => {
    if (!editContent) return null;
    const fmt = dataFormat === 'text' ? detectFormat(editContent) : dataFormat;
    
    try {
      if (fmt === 'json') return tryParseJson(editContent);
      if (fmt === 'xml') return xmlToJson(editContent);
    } catch {
      return null;
    }
    return null;
  }, [editContent, dataFormat]);

  const treeError = showTree && !treeData && editContent.trim().length > 0;

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
      id="data-panel"
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
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-primary)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32 }}>
          <ListTree size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', lineHeight: 1 }}>
            Input Data
          </span>
        </div>
        
        <div style={{ flex: 1 }} />

        {/* Integrated Control Group */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          background: 'var(--bg-surface)', 
          border: '1px solid var(--border-primary)', 
          borderRadius: 8,
          padding: 2,
          boxShadow: 'var(--shadow-sm)'
        }}>
          <button
            onClick={() => setShowTree(!showTree)}
            disabled={!loaded || dataEditMode}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '0 10px',
              height: 28,
              borderRadius: 6,
              background: showTree ? 'var(--accent-soft)' : 'transparent',
              color: showTree ? 'var(--accent)' : 'var(--text-secondary)',
              border: 'none',
              fontSize: 11,
              fontWeight: 700,
              cursor: (loaded && !dataEditMode) ? 'pointer' : 'not-allowed',
              opacity: (loaded && !dataEditMode) ? 1 : 0.5
            }}
          >
            <ListTree size={12} /> <span style={{ lineHeight: 1 }}>Tree</span>
          </button>

          {!showTree && (
            <button
              disabled={!loaded}
              onClick={handleBeautify}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '0 10px',
                height: 28,
                borderRadius: 6,
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: 'none',
                fontSize: 11,
                fontWeight: 700,
                cursor: loaded ? 'pointer' : 'not-allowed',
                opacity: loaded ? 1 : 0.5
              }}
            >
              <Wand2 size={12} /> <span style={{ lineHeight: 1 }}>Format</span>
            </button>
          )}

          <div style={{ width: 1, height: 16, background: 'var(--border-primary)', margin: '0 4px' }} />

          {dataEditMode ? (
            <button 
              onClick={handleApply}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '0 12px',
                height: 28,
                borderRadius: 6,
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <Check size={12} strokeWidth={3} /> <span style={{ lineHeight: 1 }}>Save</span>
            </button>
          ) : (
            <button
              disabled={!loaded || showTree}
              onClick={() => setDataEditMode(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '0 10px',
                height: 28,
                borderRadius: 6,
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: 'none',
                fontSize: 11,
                fontWeight: 700,
                cursor: (loaded && !showTree) ? 'pointer' : 'not-allowed',
                opacity: (loaded && !showTree) ? 1 : 0.5
              }}
            >
              <Edit3 size={12} /> <span style={{ lineHeight: 1 }}>Edit</span>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {showTree ? (
          treeData ? (
            <div style={{ padding: 12, overflowY: 'auto', height: '100%', background: 'var(--bg-surface)' }}>
              <TreeView data={treeData} />
            </div>
          ) : treeError ? (
            <div style={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: 20, 
              color: 'var(--red)',
              background: 'var(--bg-surface)',
              textAlign: 'center'
            }}>
              <AlertTriangle size={24} style={{ marginBottom: 12 }} />
              <span style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Invalid JSON or XML</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Structured view unavailable. Check for syntax errors.</span>
              <button 
                onClick={() => setShowTree(false)}
                style={{ 
                  marginTop: 16, 
                  fontSize: 11, 
                  background: 'var(--bg-hover)', 
                  border: '1px solid var(--border-primary)', 
                  padding: '4px 12px', 
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Back to Raw View
              </button>
            </div>
          ) : null
        ) : (
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
        )}
      </div>
    </motion.div>
  );
}
