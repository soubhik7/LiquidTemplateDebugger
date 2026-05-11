import { useState, useCallback } from 'react';
import { Search, Wand2, Copy, Check, CheckCircle, XCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AnimatedButton } from '../shared/AnimatedButton';
import { EmptyState } from '../shared/EmptyState';
import { escapeHtml, escapeRegex, detectFormat, beautifyContent } from '../../utils/helpers';

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

  const state = debugState?.state;
  const loaded = !!debugState?.isLoaded;
  const outputRaw = state?.outputSoFar ?? '';
  const lastChunk = state?.lastOutputChunk;
  const scopeStack = state?.scopeStack ?? [];

  const displayOutput = beautified ?? outputRaw;

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
      return;
    }
    if (result.isValid) {
      onToast(`Output is valid ${validateFmt.toUpperCase()}`, 'success');
    } else {
      const msg = result.errorMessage ?? 'Validation failed';
      const extra = result.sourceLineNumber
        ? `\n\nIssue introduced at template line: ${result.sourceLineNumber}`
        : '';
      onToast(msg + extra, 'error', 'Validation Failed', 10000);
    }
  }, [loaded, validateFmt, onValidate, onToast]);

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

  // Invalidate beautified when output changes
  const outputKey = outputRaw.length;

  return (
    <div
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
        <div style={{ flex: 1 }} />

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
        <AnimatedButton variant="ghost" size="xs" icon={<Wand2 size={11} />} onClick={handleBeautify} disabled={!loaded || !outputRaw}>
          Beautify
        </AnimatedButton>

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
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }} key={outputKey}>
        {!loaded || !outputRaw ? (
          <EmptyState
            icon="📝"
            message={loaded ? 'No output yet — step to generate' : 'Output will appear here as you step'}
          />
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
    </div>
  );
}
