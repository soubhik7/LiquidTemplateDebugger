import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Wand2, Copy, Check, CheckCircle, ListTree, X, AlertTriangle, FileText } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AnimatedButton } from '../shared/AnimatedButton';
import { EmptyState } from '../shared/EmptyState';
import { TreeView } from '../shared/TreeView';
import { escapeHtml, escapeRegex, detectFormat, beautifyContent, tryParseJson, xmlToJson } from '../../utils/helpers';

interface OutputPanelProps {
  onValidate: (format: string) => Promise<{ isValid?: boolean; errorMessage?: string; sourceLineNumber?: number; error?: string }>;
  onCopy: (text: string) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info', title?: string, duration?: number) => void;
}

export function OutputPanel({ onValidate, onCopy, onToast }: OutputPanelProps) {
  const debugState = useAppStore((s) => s.debugState);

  const [search, setSearch] = useState('');
  const [validateFmt, setValidateFmt] = useState('json');
  const [copied, setCopied] = useState(false);
  const [beautified, setBeautified] = useState<string | null>(null);
  const [showTree, setShowTree] = useState(false);
  const [lastValidation, setLastValidation] = useState<{ format: string; isValid: boolean } | null>(null);

  const state = debugState?.state;
  const loaded = !!debugState?.isLoaded;
  const outputRaw = state?.outputSoFar ?? '';
  const lastChunk = state?.lastOutputChunk;
  const scopeStack = state?.scopeStack ?? [];

  // Reset local panel state when a new session is loaded
  useEffect(() => {
    setBeautified(null);
    setLastValidation(null);
    setSearch('');
  }, [debugState?.templateSource, debugState?.dataContent]);

  // Auto-detect format when output changes
  useEffect(() => {
    if (outputRaw.trim()) {
      const detected = detectFormat(outputRaw);
      if (detected !== 'text') {
        setValidateFmt(detected);
      }
    }
  }, [outputRaw]);

  const handleCopy = useCallback(async () => {
    onCopy(outputRaw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [outputRaw, onCopy]);

  const handleBeautify = useCallback(() => {
    if (!outputRaw) { onToast('No output to beautify', 'info'); return; }
    const fmt = detectFormat(outputRaw);
    try {
      setBeautified(beautifyContent(outputRaw, fmt));
      onToast(`Formatted as ${fmt.toUpperCase()}`, 'success');
    } catch { onToast('Failed to beautify', 'error'); }
  }, [outputRaw, onToast]);

  const handleValidate = useCallback(async () => {
    if (!loaded) return;
    const result = await onValidate(validateFmt);
    if (result.error) {
      onToast(result.error, 'error', 'Validation Error');
      setLastValidation(null);
      return;
    }
    
    const isValid = !!result.isValid;
    setLastValidation({ format: validateFmt, isValid });

    if (isValid) {
      onToast(`Output is valid ${validateFmt.toUpperCase()}`, 'success');
    } else {
      const msg = result.errorMessage ?? 'Validation failed';
      const extra = result.sourceLineNumber
        ? `\n\nIssue introduced at template line: ${result.sourceLineNumber}`
        : '';
      onToast(msg + extra, 'error', 'Validation Failed', 10000);
    }
  }, [loaded, validateFmt, onValidate, onToast]);

  const treeData = useMemo(() => {
    if (!outputRaw) return null;
    const fmt = detectFormat(outputRaw);
    try {
      if (fmt === 'json') return tryParseJson(outputRaw);
      if (fmt === 'xml') return xmlToJson(outputRaw);
    } catch {
      return null;
    }
    return null;
  }, [outputRaw]);

  const treeError = showTree && !treeData && outputRaw.trim().length > 0;

  // Build highlighted HTML
  const getOutputHtml = () => {
    const src = beautified ?? outputRaw;
    if (!src) return null;
    let escaped = escapeHtml(src);

    if (search) {
      escaped = escaped.replace(
        new RegExp(escapeRegex(escapeHtml(search)), 'gi'),
        (m) => `<span class="search-highlight">${m}</span>`
      );
    } else if (!beautified && lastChunk && src.endsWith(lastChunk)) {
      const before = escapeHtml(src.substring(0, src.length - lastChunk.length));
      const last = `<span style="background:rgba(16,185,129,0.1);border-left:2px solid var(--green);padding-left:4px">${escapeHtml(lastChunk)}</span>`;
      return before + last;
    }
    return escaped;
  };

  const htmlContent = getOutputHtml();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Scope breadcrumb */}
      {scopeStack.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 4,
            alignItems: 'center',
            padding: '3px 10px',
            fontSize: 10,
            color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border-primary)',
            background: 'var(--bg-panel)',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          {scopeStack.map((s, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {i > 0 && <span>›</span>}
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: 12,
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  fontSize: 10,
                }}
              >
                {s}
              </span>
            </span>
          ))}
        </div>
      )}

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
          Output
        </span>
        {outputRaw.trim() && (
          <span style={{ 
            fontSize: 9, 
            padding: '1px 5px', 
            borderRadius: 4, 
            background: 'var(--bg-hover)', 
            border: '1px solid var(--border-primary)',
            color: 'var(--text-muted)', 
            fontWeight: 600,
            marginLeft: 4,
            textTransform: 'uppercase'
          }}>
            {detectFormat(outputRaw)}
          </span>
        )}

        {lastValidation && (
          <span style={{ 
            fontSize: 9, 
            color: lastValidation.isValid ? 'var(--green)' : 'var(--red)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 3,
            fontWeight: 700,
            background: lastValidation.isValid ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            padding: '1px 6px',
            borderRadius: 4,
            border: `1px solid ${lastValidation.isValid ? 'var(--green)' : 'var(--red)'}`,
            marginLeft: 4
          }}>
            {lastValidation.isValid ? <Check size={10} /> : <X size={10} />}
            {lastValidation.format.toUpperCase()}
          </span>
        )}

        <div style={{ flex: 1 }} />

        <AnimatedButton
          variant={showTree ? "primary" : "ghost"}
          size="xs"
          icon={<ListTree size={11} />}
          onClick={() => setShowTree(!showTree)}
          disabled={!loaded}
          title="Toggle Tree View"
        >
          Tree
        </AnimatedButton>

        <select
          value={validateFmt}
          onChange={(e) => setValidateFmt(e.target.value)}
          style={{
            fontSize: 11,
            padding: '2px 6px',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        >
          <option value="json">JSON</option>
          <option value="xml">XML</option>
          <option value="csv">CSV</option>
        </select>

        <AnimatedButton variant="ghost" size="xs" icon={<CheckCircle size={11} />} onClick={handleValidate} disabled={!loaded}>
          Validate
        </AnimatedButton>
        
        {!showTree && (
          <AnimatedButton variant="ghost" size="xs" icon={<Wand2 size={11} />} onClick={handleBeautify} disabled={!loaded || !outputRaw}>
            Beautify
          </AnimatedButton>
        )}

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={10} style={{ position: 'absolute', left: 6, color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setBeautified(null); }}
            placeholder="Search…"
            style={{
              width: 110,
              padding: '2px 8px 2px 20px',
              fontSize: 11,
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        <AnimatedButton
          variant="ghost"
          size="xs"
          icon={copied ? <Check size={11} /> : <Copy size={11} />}
          onClick={handleCopy}
          disabled={!loaded || !outputRaw}
          style={copied ? { color: 'var(--green)' } : undefined}
        >
          {copied ? 'Copied' : 'Copy'}
        </AnimatedButton>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {!loaded || !outputRaw ? (
          <EmptyState
            icon={<FileText size={24} />}
            message={loaded ? 'No output yet — step to generate' : 'Output will appear here as you step'}
          />
        ) : showTree ? (
          treeData ? (
            <div style={{ padding: 12, background: 'var(--bg-surface)', minHeight: '100%' }}>
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
          <pre
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.6,
              padding: '10px 14px',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: 'var(--text-primary)',
            }}
            dangerouslySetInnerHTML={{ __html: htmlContent ?? '' }}
          />
        )}
      </div>
    </motion.div>
  );
}
