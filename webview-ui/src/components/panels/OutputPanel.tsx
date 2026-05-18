import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Wand2, Copy, Check, CheckCircle, ListTree, X, AlertTriangle, FileText, ChevronsUpDown, ChevronsDownUp, ChevronRight, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AnimatedButton } from '../shared/AnimatedButton';
import { EmptyState } from '../shared/EmptyState';
import { TreeView } from '../shared/TreeView';
import { escapeHtml, escapeRegex, detectFormat, beautifyContent, tryParseJson, xmlToJson } from '../../utils/helpers';
import { findFoldRanges, type FoldRange } from '../../utils/folding';

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
  const [treeKey, setTreeKey] = useState(0);
  const [treeForceExpand, setTreeForceExpand] = useState<boolean | undefined>(undefined);

  const handleExpandAll = useCallback(() => { setTreeForceExpand(true); setTreeKey((k) => k + 1); }, []);
  const handleCollapseAll = useCallback(() => { setTreeForceExpand(false); setTreeKey((k) => k + 1); }, []);

  const state = debugState?.state;
  const loaded = !!debugState?.isLoaded;
  const outputRaw = state?.outputSoFar ?? '';
  const lastChunk = state?.lastOutputChunk;
  const scopeStack = state?.scopeStack ?? [];

  const [foldedLines, setFoldedLines] = useState<Set<number>>(new Set());

  const outputSrc = beautified ?? outputRaw;

  // Reset folding when the source output changes dramatically (e.g. empty or beautified toggles)
  useEffect(() => {
    setFoldedLines(new Set());
  }, [beautified, outputRaw]);

  const foldRanges = useMemo(() => findFoldRanges(outputSrc), [outputSrc]);
  const foldStartMap = useMemo(() => {
    const map = new Map<number, FoldRange>();
    foldRanges.forEach(r => map.set(r.startLine, r));
    return map;
  }, [foldRanges]);

  const isLineFolded = (ln: number) => {
    for (const range of foldRanges) {
      if (foldedLines.has(range.startLine) && ln > range.startLine && ln <= range.endLine) {
        return true;
      }
    }
    return false;
  };

  const toggleFold = (ln: number) => {
    const next = new Set(foldedLines);
    if (next.has(ln)) next.delete(ln);
    else next.add(ln);
    setFoldedLines(next);
  };

  useEffect(() => {
    const handler = (e: any) => {
      const ln = e.detail;
      if (typeof ln === 'number') {
        const next = new Set(foldedLines);
        next.delete(ln);
        setFoldedLines(next);
      }
    };
    window.addEventListener('unfold-line-output', handler);
    return () => window.removeEventListener('unfold-line-output', handler);
  }, [foldedLines]);

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
    } else if (!beautified && lastChunk) {
      const idx = src.lastIndexOf(lastChunk);
      if (idx !== -1) {
        const before = escapeHtml(src.substring(0, idx));
        const last = `<span class="output-flash-highlight">${escapeHtml(lastChunk)}</span>`;
        const after = escapeHtml(src.substring(idx + lastChunk.length));
        return before + last + after;
      }
    }
    return escaped;
  };

  const htmlContent = getOutputHtml();

  return (
    <motion.div
      id="output-panel"
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
      {/* Scope breadcrumb - Filter out 'root' */}
      {scopeStack.filter(s => s !== 'root').length > 0 && (
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
          {scopeStack.filter(s => s !== 'root').map((s, i) => (
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
          <FileText size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', lineHeight: 1 }}>
            Output
          </span>
        </div>
        
        {lastValidation && (
          <div style={{ 
            fontSize: 9, 
            color: lastValidation.isValid ? 'var(--green)' : 'var(--red)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4,
            fontWeight: 800,
            background: lastValidation.isValid ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
            padding: '2px 8px',
            borderRadius: 6,
            border: `1px solid ${lastValidation.isValid ? 'var(--green)' : 'var(--red)'}`,
            textTransform: 'uppercase'
          }}>
            {lastValidation.isValid ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
            {lastValidation.format} Valid
          </div>
        )}

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
            disabled={!loaded}
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
              cursor: loaded ? 'pointer' : 'not-allowed',
              opacity: loaded ? 1 : 0.5
            }}
          >
            <ListTree size={12} /> <span style={{ lineHeight: 1 }}>Tree</span>
          </button>

          {showTree && treeData && (
            <>
              <button
                onClick={handleExpandAll}
                title="Expand All"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '0 8px', height: 28, borderRadius: 6, background: 'transparent', color: 'var(--text-secondary)', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                <ChevronsUpDown size={12} /> <span style={{ lineHeight: 1 }}>Expand</span>
              </button>
              <button
                onClick={handleCollapseAll}
                title="Collapse All"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '0 8px', height: 28, borderRadius: 6, background: 'transparent', color: 'var(--text-secondary)', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                <ChevronsDownUp size={12} /> <span style={{ lineHeight: 1 }}>Collapse</span>
              </button>
            </>
          )}

          {!showTree && (
            <button
              disabled={!loaded || !outputRaw}
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
                cursor: (loaded && outputRaw) ? 'pointer' : 'not-allowed',
                opacity: (loaded && outputRaw) ? 1 : 0.5
              }}
            >
              <Wand2 size={12} /> <span style={{ lineHeight: 1 }}>Format</span>
            </button>
          )}

          <div style={{ width: 1, height: 16, background: 'var(--border-primary)', margin: '0 4px' }} />

          <select
            value={validateFmt}
            onChange={(e) => setValidateFmt(e.target.value)}
            style={{
              fontSize: 11,
              padding: '0 4px',
              height: 28,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              outline: 'none',
              fontWeight: 700
            }}
          >
            <option value="json">JSON</option>
            <option value="xml">XML</option>
            <option value="csv">CSV</option>
          </select>

          <button
            disabled={!loaded}
            onClick={handleValidate}
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
            <CheckCircle size={12} /> <span style={{ lineHeight: 1 }}>Check</span>
          </button>

          <div style={{ width: 1, height: 16, background: 'var(--border-primary)', margin: '0 4px' }} />

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: 28 }}>
            <Search size={12} style={{ position: 'absolute', left: 8, color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setBeautified(null); }}
              placeholder="Find..."
              style={{
                width: 100,
                height: '100%',
                padding: '0 8px 0 28px',
                fontSize: 11,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                outline: 'none',
                fontWeight: 600,
                lineHeight: '28px'
              }}
            />
          </div>

          <button
            disabled={!loaded || !outputRaw}
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '0 10px',
              height: 28,
              borderRadius: 6,
              background: copied ? 'var(--green-soft)' : 'transparent',
              color: copied ? 'var(--green)' : 'var(--text-secondary)',
              border: 'none',
              fontSize: 11,
              fontWeight: 700,
              cursor: (loaded && outputRaw) ? 'pointer' : 'not-allowed',
              opacity: (loaded && outputRaw) ? 1 : 0.5
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span style={{ lineHeight: 1 }}>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
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
              <TreeView key={treeKey} data={treeData} forceExpandAll={treeForceExpand} />
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
          <div
            style={{
              position: 'absolute',
              inset: 0,
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              lineHeight: 1.6,
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            }}
          >
            {(outputSrc ? outputSrc.split('\n') : []).map((line, i) => {
              const ln = i + 1;
              if (isLineFolded(ln)) return null;

              const range = foldStartMap.get(ln);
              const isFolded = foldedLines.has(ln);

              // Perform search highlighting or lastChunk highlighting for this line
              let escaped = escapeHtml(line);
              if (search) {
                escaped = escaped.replace(
                  new RegExp(escapeRegex(escapeHtml(search)), 'gi'),
                  (m) => `<span class="search-highlight">${m}</span>`
                );
              } else if (!beautified && lastChunk) {
                const idx = line.lastIndexOf(lastChunk);
                if (idx !== -1) {
                  const before = escapeHtml(line.substring(0, idx));
                  const last = `<span class="output-flash-highlight">${escapeHtml(lastChunk)}</span>`;
                  const after = escapeHtml(line.substring(idx + lastChunk.length));
                  escaped = before + last + after;
                }
              }

              return (
                <div
                  key={ln}
                  className="code-line"
                  style={{
                    display: 'flex',
                    minHeight: 20,
                    paddingRight: 12,
                    transition: 'background 0.3s ease',
                  }}
                >
                  {/* Gutter */}
                  <div
                    style={{
                      width: 56,
                      minWidth: 56,
                      display: 'flex',
                      alignItems: 'center',
                      paddingRight: 4,
                      userSelect: 'none',
                      flexShrink: 0,
                      position: 'relative',
                      zIndex: 1,
                      borderRight: '1px solid var(--border-primary)',
                      background: 'var(--bg-panel)',
                      opacity: 0.8,
                    }}
                  >
                    {/* Line Number */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4 }}>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 500 }}>
                        {ln}
                      </span>
                    </div>

                    {/* Folding Slot */}
                    <div style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {range && (
                        <button
                          onClick={() => toggleFold(ln)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 4,
                            color: isFolded ? 'var(--accent)' : 'var(--text-muted)',
                            transition: 'all 0.2s',
                          }}
                          className="fold-btn"
                        >
                          {isFolded ? <ChevronRight size={12} strokeWidth={2.5} /> : <ChevronDown size={12} strokeWidth={2.5} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Line Content */}
                  <span
                    style={{ flex: 1, whiteSpace: 'pre', paddingLeft: 8, position: 'relative', zIndex: 1 }}
                    dangerouslySetInnerHTML={{
                      __html: isFolded
                        ? `${escaped} <span class="fold-placeholder" title="Expand block" onclick="window.dispatchEvent(new CustomEvent('unfold-line-output', {detail: ${ln}}))">...</span>`
                        : escaped,
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
