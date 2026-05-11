import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Copy, Edit3, Check, ChevronRight, ChevronDown, FileCode, Play } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AnimatedButton } from '../shared/AnimatedButton';
import { EmptyState } from '../shared/EmptyState';
import { Tooltip } from '../shared/Tooltip';
import { useDebugger } from '../../hooks/useDebugger';
import { escapeHtml, highlightSyntax, escapeRegex } from '../../utils/helpers';
import { findFoldRanges, type FoldRange } from '../../utils/folding';
import type { Breakpoint } from '../../types/app';

interface TemplatePanelProps {
  onToggleBreakpoint: (line: number) => void;
  onConditionalBreakpoint: (line: number) => void;
  onCopy: () => void;
  onApplyEdits: (content: string) => void;
}

export function TemplatePanel({
  onToggleBreakpoint,
  onConditionalBreakpoint,
  onCopy,
  onApplyEdits,
}: TemplatePanelProps) {
  const debugState = useAppStore((s) => s.debugState);
  const templateEditMode = useAppStore((s) => s.templateEditMode);
  const setTemplateEditMode = useAppStore((s) => s.setTemplateEditMode);

  const [search, setSearch] = useState('');
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [foldedLines, setFoldedLines] = useState<Set<number>>(new Set());

  const { evaluate } = useDebugger();
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: React.ReactNode;
    visible: boolean;
    loading?: boolean;
  }>({
    x: 0,
    y: 0,
    content: null,
    visible: false,
    loading: false,
  });

  const bodyRef = useRef<HTMLDivElement>(null);

  const source = debugState?.templateSource ?? '';
  const elements = debugState?.elements ?? [];
  const state = debugState?.state;
  const breakpoints = debugState?.breakpoints ?? [];
  const loaded = !!debugState?.isLoaded;

  const bpMap = Object.fromEntries(breakpoints.map((bp: Breakpoint) => [bp.line, bp]));

  const currentLine =
    state && !state.isComplete && state.currentElementIndex < elements.length
      ? elements[state.currentElementIndex]?.lineNumber ?? -1
      : -1;

  const foldRanges = useMemo(() => findFoldRanges(source), [source]);
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

  useEffect(() => {
    if (templateEditMode && source) {
      setEditContent(source);
    }
  }, [templateEditMode, source]);

  // Scroll to current line
  useEffect(() => {
    if (currentLine > 0 && bodyRef.current) {
      const el = bodyRef.current.querySelector(`[data-line="${currentLine}"]`) as HTMLElement;
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [currentLine]);

  const handleCopy = useCallback(async () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [onCopy]);

  const handleApply = useCallback(() => {
    onApplyEdits(editContent);
    setTemplateEditMode(false);
  }, [editContent, onApplyEdits, setTemplateEditMode]);

  const toggleFold = (ln: number) => {
    const next = new Set(foldedLines);
    if (next.has(ln)) next.delete(ln);
    else next.add(ln);
    setFoldedLines(next);
  };

  const lines = source ? source.split('\n') : [];

  // Compute search matches
  useEffect(() => {
    if (!search || !source) { setMatchCount(0); return; }
    const pattern = new RegExp(escapeRegex(search), 'gi');
    const matches = source.match(pattern);
    setMatchCount(matches?.length ?? 0);
  }, [search, source]);

  useEffect(() => {
    const handler = (e: any) => {
      const ln = e.detail;
      if (typeof ln === 'number') {
        const next = new Set(foldedLines);
        next.delete(ln);
        setFoldedLines(next);
      }
    };
    window.addEventListener('unfold-line', handler);
    return () => window.removeEventListener('unfold-line', handler);
  }, [foldedLines]);

  const handleMouseMove = useCallback(
    async (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const tokOutput = target.closest('.tok-output') as HTMLElement;

      if (!tokOutput) {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      const expr = tokOutput.getAttribute('data-expr');
      const type = tokOutput.getAttribute('data-type') || 'output';
      if (!expr) return;

      const rect = tokOutput.getBoundingClientRect();
      const x = Math.min(rect.left, window.innerWidth - 300);
      const y = rect.bottom + 8;

      // Avoid re-evaluating if we are already showing this expression
      if (tooltip.visible && tooltip.content && (tooltip.content as any).key === expr) {
        // Just update position if it moved slightly but still in same element
        setTooltip((prev) => ({ ...prev, x, y }));
        return;
      }

      setTooltip({ x, y, visible: true, loading: true, content: null });

      try {
        const res = await evaluate(expr);
        if (res) {
          const header = type === 'output' ? `{{ ${expr} }}` : expr;
          setTooltip({
            x,
            y,
            visible: true,
            loading: false,
            content: (
              <div key={expr} style={{ minWidth: 180 }}>
                <div style={{ 
                  color: 'var(--accent)', 
                  fontWeight: 800, 
                  marginBottom: 8, 
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  borderBottom: '1px solid var(--border-primary)',
                  paddingBottom: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
                  {header}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', minWidth: 45 }}>Value</span>
                    <span style={{ 
                      color: 'var(--text-primary)', 
                      wordBreak: 'break-all', 
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      background: 'var(--bg-hover)',
                      padding: '2px 6px',
                      borderRadius: 4,
                      border: '1px solid var(--border-primary)'
                    }}>
                      {res.value === '' ? '""' : (res.value ?? 'nil')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', minWidth: 45 }}>Type</span>
                    <span style={{ 
                      color: 'var(--accent)', 
                      fontSize: 11,
                      fontWeight: 600,
                      background: 'var(--accent-soft)',
                      padding: '1px 6px',
                      borderRadius: 4
                    }}>
                      {res.typeName ?? 'Null'}
                    </span>
                  </div>
                </div>
              </div>
            ),
          });
        }
      } catch {
        setTooltip((prev) => ({ ...prev, visible: false }));
      }
    },
    [evaluate, tooltip.visible, tooltip.content]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-primary)',
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
          Template
        </span>
        {loaded && (
          <span
            style={{
              fontSize: 10,
              padding: '1px 7px',
              borderRadius: 20,
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              fontWeight: 600,
            }}
          >
            {elements.length} el
          </span>
        )}
        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={11} style={{ position: 'absolute', left: 6, color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            style={{
              width: 130,
              padding: '2px 8px 2px 22px',
              fontSize: 11,
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          {matchCount > 0 && (
            <span style={{ position: 'absolute', right: 6, fontSize: 9, color: 'var(--text-muted)' }}>
              {matchCount}
            </span>
          )}
        </div>

        {templateEditMode ? (
          <AnimatedButton variant="primary" size="xs" icon={<Check size={11} />} onClick={handleApply}>
            Apply
          </AnimatedButton>
        ) : (
          <AnimatedButton
            variant="ghost"
            size="xs"
            icon={<Edit3 size={11} />}
            onClick={() => setTemplateEditMode(true)}
            disabled={!loaded}
          >
            Edit
          </AnimatedButton>
        )}

        <AnimatedButton
          variant="ghost"
          size="xs"
          icon={copied ? <Check size={11} /> : <Copy size={11} />}
          onClick={handleCopy}
          disabled={!loaded}
          style={copied ? { color: 'var(--green)', borderColor: 'var(--green)' } : undefined}
        >
          {copied ? 'Copied' : 'Copy'}
        </AnimatedButton>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait">
          {templateEditMode ? (
            <motion.textarea
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
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
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                lineHeight: 1.7,
                padding: '8px 12px',
                border: 'none',
                outline: 'none',
                resize: 'none',
                tabSize: 2,
              }}
            />
          ) : (
            <motion.div
              key="viewer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              ref={bodyRef}
              style={{
                position: 'absolute',
                inset: 0,
                overflowY: 'auto',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                lineHeight: 1.7,
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {!loaded ? (
                <EmptyState icon={<FileCode size={24} />} message="Load a template to start debugging" />
              ) : (
                lines.map((line, i) => {
                  const ln = i + 1;
                  const isCur = ln === currentLine;
                  const bp = bpMap[ln];
                  const rawLine = escapeHtml(line);
                  const highlighted = search
                    ? (highlightSyntax(rawLine)).replace(
                        new RegExp(escapeRegex(escapeHtml(search)), 'gi'),
                        (m) => `<span class="search-highlight">${m}</span>`
                      )
                    : highlightSyntax(rawLine);

                  if (isLineFolded(ln)) return null;

                  const range = foldStartMap.get(ln);
                  const isFolded = foldedLines.has(ln);

                  return (
                    <div
                      key={ln}
                      data-line={ln}
                      className={`code-line ${isCur ? 'code-line-active' : ''}`}
                      style={{
                        display: 'flex',
                        minHeight: 22,
                        paddingRight: 12,
                        borderLeft: '2px solid transparent',
                      }}
                    >
                      {/* Gutter */}
                      <div
                        key={ln}
                        style={{
                          width: 48,
                          minWidth: 48,
                          display: 'flex',
                          alignItems: 'center',
                          paddingRight: 4,
                          userSelect: 'none',
                          flexShrink: 0,
                          position: 'relative',
                          zIndex: 1,
                        }}
                      >
                        {/* Breakpoint & Hint */}
                        <div
                          title="Toggle breakpoint (right-click for condition)"
                          onClick={() => onToggleBreakpoint(ln)}
                          onContextMenu={(e) => { e.preventDefault(); onConditionalBreakpoint(ln); }}
                          style={{
                            width: 14,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          {bp ? (
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: 'var(--bp-color)',
                                opacity: bp.isEnabled ? 1 : 0.4,
                                boxShadow: bp.isEnabled ? `0 0 6px var(--bp-glow)` : 'none',
                                border: '1px solid rgba(255,255,255,0.1)',
                              }}
                            />
                          ) : (
                            <div className="bp-hint" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--bp-color)', opacity: 0 }} />
                          )}
                        </div>

                        {/* Line Number & Folding Combined Slot */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, opacity: isCur ? 1 : 0.7 }}>
                            {ln}
                          </span>
                          <div style={{ width: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {range && (
                              <button
                                onClick={() => toggleFold(ln)}
                                style={{ 
                                  background: 'none', 
                                  border: 'none', 
                                  cursor: 'pointer', 
                                  padding: 0, 
                                  display: 'flex',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                {isFolded ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Current Line Indicator (overlay or tiny arrow) */}
                        {isCur && (
                          <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', color: 'var(--yellow)', display: 'flex' }}>
                            <Play size={8} fill="currentColor" stroke="none" />
                          </div>
                        )}
                      </div>

                      {/* Line content */}
                      <span
                        style={{ flex: 1, whiteSpace: 'pre', paddingLeft: 8, position: 'relative', zIndex: 1 }}
                        dangerouslySetInnerHTML={{ __html: isFolded ? `${highlighted} <span class="fold-placeholder" title="Expand block" onclick="window.dispatchEvent(new CustomEvent('unfold-line', {detail: ${ln}}))">...</span>` : highlighted }}
                      />
                    </div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Tooltip {...tooltip} />
    </motion.div>
  );
}
