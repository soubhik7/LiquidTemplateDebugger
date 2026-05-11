import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Copy, Edit3, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AnimatedButton } from '../shared/AnimatedButton';
import { EmptyState } from '../shared/EmptyState';
import { Tooltip } from '../shared/Tooltip';
import { useDebugger } from '../../hooks/useDebugger';
import { escapeHtml, highlightSyntax, escapeRegex } from '../../utils/helpers';
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

  const lines = source ? source.split('\n') : [];

  // Compute search matches
  useEffect(() => {
    if (!search || !source) { setMatchCount(0); return; }
    const pattern = new RegExp(escapeRegex(search), 'gi');
    const matches = source.match(pattern);
    setMatchCount(matches?.length ?? 0);
  }, [search, source]);

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
              <div key={expr} style={{ fontSize: 12 }}>
                <div style={{ color: 'var(--blue)', fontWeight: 600, marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                  {header}
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
                  <span style={{ color: 'var(--text-muted)', minWidth: 40 }}>Value:</span>
                  <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{res.value ?? 'nil'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--text-muted)', minWidth: 40 }}>Type:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{res.typeName ?? 'Null'}</span>
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
                <EmptyState icon="📄" message="Load a template to start debugging" />
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
                        style={{
                          width: 56,
                          minWidth: 56,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          paddingRight: 4,
                          gap: 2,
                          userSelect: 'none',
                          flexShrink: 0,
                          position: 'relative',
                          zIndex: 1,
                        }}
                      >
                        {/* Breakpoint dot */}
                        <div
                          title="Toggle breakpoint (right-click for condition)"
                          onClick={() => onToggleBreakpoint(ln)}
                          onContextMenu={(e) => { e.preventDefault(); onConditionalBreakpoint(ln); }}
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          {bp ? (
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: 'var(--bp-color)',
                                boxShadow: `0 0 8px 1px var(--bp-glow)`,
                                opacity: bp.isEnabled ? 1 : 0.4,
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                              }}
                            />
                          ) : (
                            <div
                              className="bp-hint"
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: 'var(--bp-color)',
                                opacity: 0,
                                transition: 'opacity 0.15s',
                              }}
                            />
                          )}
                        </div>

                        <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 22, textAlign: 'right' }}>
                          {ln}
                        </span>
                        <span style={{ width: 14, color: 'var(--yellow)', fontWeight: 700, fontSize: 12 }}>
                          {isCur ? '▶' : ' '}
                        </span>
                      </div>

                        {/* Line content */}
                        <span
                          style={{ flex: 1, whiteSpace: 'pre', paddingLeft: 8, position: 'relative', zIndex: 1 }}
                          dangerouslySetInnerHTML={{ __html: highlighted }}
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
