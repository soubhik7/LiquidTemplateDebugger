import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Play, ChevronDown, ChevronRight, Eye, Circle, Zap, Lock, CheckCircle, Hash, Target, FlaskConical, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AnimatedButton } from '../shared/AnimatedButton';
import { EmptyState } from '../shared/EmptyState';
import { expandDown } from '../../utils/animation';
import { TreeView } from '../shared/TreeView';
import { truncate, formatRawValue, tryParseJson, detectFormat } from '../../utils/helpers';
import type { InspectorTab, WatchExpression } from '../../types/app';

interface InspectorPanelProps {
  onAddWatch: (expr: string) => void;
  onRemoveWatch: (id: number) => void;
  onToggleBreakpoint: (id: number) => void;
  onRemoveBreakpoint: (id: number) => void;
  onEvaluate: (expr: string) => Promise<{ value?: string; typeName?: string; error?: string; transformations?: any[] }>;
  onReset?: () => void;
}

function extractExpressions(text: string): string[] {
  const expressions: string[] = [];
  // Extract output expressions {{ ... }}
  const outputMatches = text.matchAll(/\{\{\s*(.*?)\s*\}\}/g);
  for (const match of outputMatches) {
    if (match[1]) expressions.push(match[1].trim());
  }
  // Extract tag expressions {% ... %}
  const tagMatches = text.matchAll(/\{%\s*(?:assign|capture|if|elsif|for|unless|case|when|tablerow)\s+(.*?)\s*%\}/g);
  for (const match of tagMatches) {
    if (match[1]) expressions.push(match[1].trim());
  }
  return Array.from(new Set(expressions));
}

const TABS: { id: InspectorTab; label: string }[] = [
  { id: 'watches', label: 'Watches' },
  { id: 'breakpoints', label: 'Breakpoints' },
  { id: 'eval', label: 'Evaluate' },
  { id: 'problems', label: 'Problems' },
];

export function InspectorPanel({
  onAddWatch,
  onRemoveWatch,
  onToggleBreakpoint,
  onRemoveBreakpoint,
  onEvaluate,
  onReset,
}: InspectorPanelProps) {
  const debugState = useAppStore((s) => s.debugState);
  const activeTab = useAppStore((s) => s.activeInspectorTab);
  const setTab = useAppStore((s) => s.setInspectorTab);
  const expandedWatches = useAppStore((s) => s.expandedWatches);
  const toggleWatchExpand = useAppStore((s) => s.toggleWatchExpand);
  const expandedBreakpoints = useAppStore((s) => s.expandedBreakpoints);
  const toggleBreakpointExpand = useAppStore((s) => s.toggleBreakpointExpand);
  const validationErrors = useAppStore((s) => s.validationErrors);

  const [watchInput, setWatchInput] = useState('');
  const [evalInput, setEvalInput] = useState('');
  const [evalResult, setEvalResult] = useState<{ value?: string; typeName?: string; error?: string; transformations?: any[] } | null>(null);
  const [bpEvaluations, setBpEvaluations] = useState<Record<number, Record<string, any>>>({});

  const loaded = !!debugState?.isLoaded;
  const watches = debugState?.watches ?? [];
  const breakpoints = debugState?.breakpoints ?? [];

  const handleAddWatch = useCallback(() => {
    const expr = watchInput.trim();
    if (!expr || !loaded) return;
    onAddWatch(expr);
    setWatchInput('');
  }, [watchInput, loaded, onAddWatch]);

  const handleEval = useCallback(async () => {
    const expr = evalInput.trim();
    if (!expr || !loaded) return;
    const r = await onEvaluate(expr);
    
    let enriched = { ...r };
    
    // 1. Contextual Pipeline Stitching
    const baseVarName = expr.split(/[\| \.\[]/)[0];
    const variable = debugState?.state?.variables.find(v => v.name === baseVarName);
    if (variable?.transformations) {
      enriched.transformations = [...variable.transformations, ...(enriched.transformations ?? [])];
    }
    
    // 2. Typo Hinting
    if (enriched.value === 'nil' && !enriched.error) {
      const suggestions = debugState?.state?.variables
        .map(v => v.name)
        .filter(name => name.startsWith(expr) || expr.startsWith(name));
      if (suggestions && suggestions.length > 0 && suggestions[0] !== expr) {
        enriched.error = `Variable "${expr}" not found. Did you mean "${suggestions[0]}"?`;
      }
    }
    
    setEvalResult(enriched);
  }, [evalInput, loaded, onEvaluate, debugState?.state?.variables]);

  const handleBpExpand = useCallback(async (id: number, line: string) => {
    toggleBreakpointExpand(id);
    if (!expandedBreakpoints.has(id)) {
      // About to expand
      const exprs = extractExpressions(line);
      if (exprs.length > 0) {
        const results: Record<string, any> = {};
        for (const expr of exprs) {
          try {
            const res = await onEvaluate(expr);
            // Check if it matches a variable to get transformations
            const variable = debugState?.state?.variables.find(v => v.name === expr || (expr.includes('.') && v.name === expr.split('.')[0]));
            results[expr] = { ...res, transformations: res.transformations ?? variable?.transformations };
          } catch {
            results[expr] = { error: 'Evaluation failed' };
          }
        }
        setBpEvaluations(prev => ({ ...prev, [id]: results }));
      }
    }
  }, [expandedBreakpoints, toggleBreakpointExpand, onEvaluate, debugState?.state?.variables]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-primary)',
          background: 'var(--bg-panel)',
          flexShrink: 0,
        }}
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1,
              padding: '7px 4px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === id ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              color: activeTab === id ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'all var(--transition-fast)',
              letterSpacing: '0.3px',
            }}
          >
            {label}
            {id === 'watches' && watches.length > 0 && (
              <span
                style={{
                  marginLeft: 4,
                  fontSize: 9,
                  padding: '0 4px',
                  borderRadius: 8,
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                }}
              >
                {watches.length}
              </span>
            )}
            {id === 'breakpoints' && breakpoints.length > 0 && (
              <span
                style={{
                  marginLeft: 4,
                  fontSize: 9,
                  padding: '0 4px',
                  borderRadius: 8,
                  background: 'rgba(239,68,68,0.1)',
                  color: 'var(--red)',
                }}
              >
                {breakpoints.length}
              </span>
            )}
            {id === 'problems' && validationErrors.length > 0 && (
              <span
                style={{
                  marginLeft: 4,
                  fontSize: 9,
                  padding: '0 4px',
                  borderRadius: 8,
                  background: 'rgba(239,68,68,0.1)',
                  color: 'var(--red)',
                }}
              >
                {validationErrors.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {/* Watches */}
          {activeTab === 'watches' && (
            <motion.div
              key="watches"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  padding: '6px 8px',
                  borderBottom: '1px solid var(--border-primary)',
                  flexShrink: 0,
                }}
              >
                <input
                  value={watchInput}
                  onChange={(e) => setWatchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddWatch()}
                  placeholder="Watch expression…"
                  disabled={!loaded}
                  style={{
                    flex: 1,
                    padding: '3px 8px',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    opacity: loaded ? 1 : 0.5,
                  }}
                />
                <AnimatedButton
                  variant="primary"
                  size="xs"
                  icon={<Plus size={11} />}
                  onClick={handleAddWatch}
                  disabled={!loaded || !watchInput.trim()}
                >
                  Add
                </AnimatedButton>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {watches.length === 0 ? (
                  <EmptyState icon={<Eye size={24} />} message="No watches" sub="Add an expression above" />
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <tbody>
                      {watches.map((w: WatchExpression) => {
                        const expanded = expandedWatches.has(w.id);
                        return (
                          <React.Fragment key={w.id}>
                            <tr
                              onClick={() => toggleWatchExpand(w.id)}
                              style={{
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--border-primary)',
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                            >
                              <td style={{ padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <span style={{ color: 'var(--text-muted)' }}>
                                  {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                </span>
                                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>
                                  {w.expression}
                                </span>
                              </td>
                              <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                                {truncate(w.currentValue ?? 'nil', 20)}
                              </td>
                              <td style={{ padding: '5px 8px', width: 24 }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); onRemoveWatch(w.id); }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    padding: 2,
                                    borderRadius: 2,
                                  }}
                                  title="Remove watch"
                                >
                                  <X size={11} />
                                </button>
                              </td>
                            </tr>
                            <AnimatePresence>
                              {expanded && (
                                <tr key={`${w.id}-detail`}>
                                  <td colSpan={3} style={{ padding: 0 }}>
                                    <motion.div
                                      variants={expandDown}
                                      initial="hidden"
                                      animate="visible"
                                      exit="exit"
                                      style={{
                                        background: 'var(--bg-primary)',
                                        borderLeft: '2px solid var(--accent)',
                                        margin: '2px 8px 6px',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '6px 10px',
                                        fontSize: 11,
                                      }}
                                    >
                                      <div style={{ marginBottom: 6 }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                          Value
                                        </span>
                                        <pre
                                          style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: 11,
                                            color: 'var(--text-secondary)',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-all',
                                            maxHeight: 120,
                                            overflowY: 'auto',
                                            marginTop: 4,
                                          }}
                                          dangerouslySetInnerHTML={{ __html: formatRawValue(w.rawValue) }}
                                        />
                                      </div>

                                      {w.typeName && (
                                        <div style={{ marginBottom: 6 }}>
                                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                            Type: <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>{w.typeName}</span>
                                          </span>
                                        </div>
                                      )}

                                      {w.transformations && w.transformations.length > 0 && (
                                        <div style={{ marginTop: 8 }}>
                                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                            Transformations
                                          </span>
                                          {w.transformations.map((t, idx) => (
                                            <div
                                              key={idx}
                                              style={{
                                                marginTop: 6,
                                                padding: '8px 12px',
                                                background: 'var(--accent-soft)',
                                                border: '1px solid var(--accent-glow)',
                                                borderRadius: 'var(--radius-md)',
                                                fontSize: 11,
                                                fontFamily: 'var(--font-mono)',
                                                boxShadow: 'inset 0 0 20px rgba(99, 102, 241, 0.05)'
                                              }}
                                            >
                                              <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
                                                {t.operator && ['+', '-', '*', '/', '%'].includes(t.operator) ? (
                                                  `${idx === 0 ? (t.baseExpr || 'value') : 'result'} ${t.operator} ${t.rightVar || '?'}`
                                                ) : t.name ? (
                                                  `${t.name}${t.args ? `(${t.args})` : ''}`
                                                ) : (
                                                  t.operator || 'Transformation'
                                                )}
                                              </div>
                                              <div style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {t.operator && ['+', '-', '*', '/', '%'].includes(t.operator) ? (
                                                  <span>{String(t.before ?? 'nil')} {t.operator} {String(t.rightValue ?? 'nil')}</span>
                                                ) : (
                                                  <span>{String(t.before ?? 'nil')}</span>
                                                )}
                                                <span style={{ opacity: 0.5 }}>→</span>
                                                <span style={{ color: 'var(--green)', fontWeight: 700 }}>{String(t.after ?? 'nil')}</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </motion.div>
                                  </td>
                                </tr>
                              )}
                            </AnimatePresence>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          )}

          {/* Breakpoints */}
          {activeTab === 'breakpoints' && (
            <motion.div
              key="breakpoints"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, overflowY: 'auto' }}
            >
              {breakpoints.length === 0 ? (
                <EmptyState
                  icon={<Circle size={24} fill="var(--red)" stroke="none" />}
                  message="No breakpoints set"
                  sub="Click the gutter in the template panel to add one"
                />
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <tbody>
                    {breakpoints.map((bp) => {
                      const expanded = expandedBreakpoints.has(bp.id);
                      const lines = debugState?.templateSource?.split('\n') ?? [];
                      const codeSnippet = lines[bp.line - 1]?.trim() ?? '';

                      return (
                        <React.Fragment key={bp.id}>
                          <tr
                            onClick={() => handleBpExpand(bp.id, lines[bp.line - 1] ?? '')}
                            style={{
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border-primary)',
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                          >
                            <td style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <span style={{ color: 'var(--text-muted)' }}>
                                {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); onToggleBreakpoint(bp.id); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0, display: 'flex' }}
                                title={bp.isEnabled ? 'Disable' : 'Enable'}
                              >
                                <Circle size={10} fill="currentColor" stroke="none" style={{ color: bp.isEnabled ? 'var(--bp-color)' : 'var(--text-muted)', opacity: bp.isEnabled ? 1 : 0.4 }} />
                              </button>
                              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bp-color)', fontWeight: 600, marginLeft: 2 }}>
                                {bp.line}
                              </span>
                              <span
                                style={{
                                  marginLeft: 6,
                                  fontFamily: 'var(--font-mono)',
                                  color: 'var(--text-secondary)',
                                  fontSize: 11,
                                  opacity: bp.isEnabled ? 1 : 0.5,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  flex: 1,
                                  marginRight: 8,
                                }}
                              >
                                {codeSnippet || '(empty line)'}
                              </span>
                              {bp.hitCount > 0 && (
                                <span
                                  className={`bp-hit-badge ${!bp.isEnabled ? 'disabled' : ''}`}
                                  title={`${bp.hitCount} hits`}
                                >
                                  {bp.hitCount}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '6px 4px', width: 24 }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); onRemoveBreakpoint(bp.id); }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--text-muted)',
                                  display: 'flex',
                                  padding: 2,
                                  borderRadius: 2,
                                }}
                                title="Remove breakpoint"
                              >
                                <X size={11} />
                              </button>
                            </td>
                          </tr>

                          <AnimatePresence>
                            {expanded && (
                              <tr key={`${bp.id}-detail`}>
                                <td colSpan={3} style={{ padding: 0 }}>
                                  <motion.div
                                    variants={expandDown}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    style={{
                                      background: 'var(--bg-primary)',
                                      borderLeft: `2px solid ${bp.isEnabled ? 'var(--bp-color)' : 'var(--text-muted)'}`,
                                      margin: '2px 8px 6px',
                                      borderRadius: 'var(--radius-sm)',
                                      padding: '8px 10px',
                                      fontSize: 11,
                                    }}
                                  >
                                    <div style={{ marginBottom: 8 }}>
                                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                        Source Line {bp.line}
                                      </span>
                                      <pre
                                        style={{
                                          fontFamily: 'var(--font-mono)',
                                          fontSize: 11,
                                          color: 'var(--text-primary)',
                                          background: 'var(--bg-hover)',
                                          padding: '6px 8px',
                                          borderRadius: 'var(--radius-sm)',
                                          marginTop: 4,
                                          whiteSpace: 'pre-wrap',
                                          wordBreak: 'break-all',
                                          border: '1px solid var(--border-primary)',
                                        }}
                                      >
                                        {lines[bp.line - 1] || ''}
                                      </pre>
                                    </div>

                                    {bp.condition && (
                                      <div style={{ marginBottom: 8 }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                          Condition
                                        </span>
                                        <div
                                          style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: 11,
                                            color: 'var(--text-secondary)',
                                            background: 'rgba(245, 158, 11, 0.05)',
                                            padding: '4px 8px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid rgba(245, 158, 11, 0.2)',
                                            marginTop: 4,
                                          }}
                                        >
                                          {bp.condition}
                                        </div>
                                      </div>
                                    )}

                                    {/* Line Evaluations */}
                                    {bpEvaluations[bp.id] && Object.keys(bpEvaluations[bp.id]).length > 0 && (
                                      <div style={{ marginBottom: 8 }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                          Line Evaluations
                                        </span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                                          {Object.entries(bpEvaluations[bp.id]).map(([expr, res]: [string, any]) => (
                                            <div key={expr} style={{ background: 'var(--bg-hover)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)' }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>{expr}</span>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)', fontWeight: 600 }}>{res.value ?? 'nil'}</span>
                                              </div>
                                              {res.transformations && res.transformations.length > 0 && (
                                                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                  {res.transformations.map((t: any, idx: number) => (
                                                    <div
                                                      key={idx}
                                                      style={{
                                                        padding: '4px 6px',
                                                        background: 'var(--bg-surface)',
                                                        border: '1px solid var(--border-primary)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: 10,
                                                        fontFamily: 'var(--font-mono)',
                                                      }}
                                                    >
                                                      <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 2 }}>
                                                        {t.operator && ['+', '-', '*', '/', '%'].includes(t.operator)
                                                          ? `${idx === 0 ? (t.baseExpr ?? 'value') : 'result'} ${t.operator} ${t.rightVar}`
                                                          : (t.name ?? 'filter')}
                                                      </div>
                                                      <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span>{String(t.before)}</span>
                                                        <span style={{ opacity: 0.5 }}>→</span>
                                                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{String(t.after)}</span>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-primary)', marginTop: 8, paddingTop: 8 }}>
                                      <div style={{ display: 'flex', gap: 12 }}>
                                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                          Status: <span style={{ color: bp.isEnabled ? 'var(--green)' : 'var(--text-muted)', fontWeight: 600 }}>{bp.isEnabled ? 'Enabled' : 'Disabled'}</span>
                                        </span>
                                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }} title="Cumulative hits across this entire debugging session">
                                          Session Hits: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{bp.hitCount}</span>
                                        </span>
                                      </div>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); onReset?.(); }}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          cursor: 'pointer',
                                          color: 'var(--text-muted)',
                                          fontSize: 9,
                                          textDecoration: 'underline',
                                          padding: 0,
                                        }}
                                        title="Clear all session data and hit counts"
                                      >
                                        Reset Session
                                      </button>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </motion.div>
          )}

          {/* Evaluate */}
          {activeTab === 'eval' && (
            <motion.div
              key="eval"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  padding: '6px 8px',
                  borderBottom: '1px solid var(--border-primary)',
                  flexShrink: 0,
                }}
              >
                <input
                  value={evalInput}
                  onChange={(e) => setEvalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEval()}
                  placeholder="Evaluate Liquid expression…"
                  disabled={!loaded}
                  style={{
                    flex: 1,
                    padding: '3px 8px',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    opacity: loaded ? 1 : 0.5,
                  }}
                />
                <AnimatedButton
                  variant="primary"
                  size="xs"
                  icon={<Play size={11} />}
                  onClick={handleEval}
                  disabled={!loaded || !evalInput.trim()}
                >
                  Eval
                </AnimatedButton>
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {evalResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ padding: '4px 10px 20px' }}
                  >
                    {evalResult.error ? (
                      <div style={{ 
                        padding: '12px 16px', 
                        background: 'rgba(239,68,68,0.05)', 
                        border: '1px solid rgba(239,68,68,0.2)', 
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--red)',
                        fontSize: 12
                      }}>
                        <div style={{ fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', fontSize: 10 }}>Evaluation Error</div>
                        {evalResult.error.includes('Did you mean') ? (
                          <>
                            {evalResult.error.split('Did you mean')[0]}
                            Did you mean{' '}
                            <button
                              onClick={() => {
                                const match = evalResult.error?.match(/"(.*?)"\?$/);
                                if (match && match[1]) {
                                  setEvalInput(match[1]);
                                  // Wait for state to update then eval
                                  setTimeout(handleEval, 0);
                                }
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                color: 'var(--accent)',
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                fontSize: 'inherit',
                                fontWeight: 600,
                              }}
                            >
                              {evalResult.error.match(/"(.*?)"\?$/)?.[1]}
                            </button>?
                          </>
                        ) : (
                          evalResult.error
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Summary Header */}
                        <div style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: 10 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                            Expression Result
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                            <span style={{ 
                              fontSize: 18, 
                              fontWeight: 700, 
                              color: evalResult.value === 'nil' ? 'var(--text-muted)' : 'var(--accent)', 
                              fontFamily: 'var(--font-mono)',
                              fontStyle: evalResult.value === 'nil' ? 'italic' : 'normal'
                            }}>
                              {truncate(evalResult.value ?? 'nil', 40)}
                            </span>
                            {(evalResult.typeName || evalResult.value === 'nil') && (
                              <span style={{ 
                                fontSize: 11, 
                                color: evalResult.value === 'nil' ? 'var(--text-muted)' : 'var(--accent)', 
                                background: evalResult.value === 'nil' ? 'var(--bg-hover)' : 'var(--accent-soft)', 
                                padding: '1px 6px', 
                                borderRadius: 4,
                                fontWeight: 600
                              }}>
                                {evalResult.typeName || 'Null'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Transformation Pipeline */}
                        {evalResult.transformations && evalResult.transformations.length > 0 && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                              Transformation Pipeline
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingLeft: 4 }}>
                              {evalResult.transformations.map((t, idx) => (
                                  <div style={{ position: 'relative', paddingLeft: 20, paddingBottom: 20 }}>
                                    {/* Line connector */}
                                    {idx < evalResult.transformations!.length - 1 && (
                                      <div style={{ position: 'absolute', left: 4, top: 12, bottom: -4, width: 2, background: 'var(--border-primary)' }} />
                                    )}
                                    {/* Dot */}
                                    <div style={{ 
                                      position: 'absolute', 
                                      left: 0, 
                                      top: 4, 
                                      width: 10, 
                                      height: 10, 
                                      borderRadius: '50%', 
                                      background: 'var(--accent)', 
                                      border: '2px solid var(--bg-surface)',
                                      boxShadow: '0 0 4px var(--accent-glow)'
                                    }} />
                                    
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)' }}>
                                        {t.operator && ['+', '-', '*', '/', '%'].includes(t.operator) ? <Hash size={14} /> : 
                                         ['round', 'floor', 'ceil', 'abs'].includes(t.operator) ? <Target size={14} /> : <FlaskConical size={14} />}
                                      </span>
                                      {t.name || (t.operator ? t.operator.toUpperCase() : 'STEP')}
                                    </div>

                                    <div style={{ 
                                      background: 'var(--accent-soft)', 
                                      border: '1px solid var(--accent-glow)', 
                                      borderRadius: 'var(--radius-md)', 
                                      padding: '8px 12px',
                                      fontSize: 11,
                                      boxShadow: 'inset 0 0 20px rgba(99, 102, 241, 0.05)'
                                    }}>
                                      {/* Expression View */}
                                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
                                        {t.operator && ['+', '-', '*', '/', '%'].includes(t.operator) ? (
                                          `${idx === 0 ? (t.baseExpr || 'value') : 'result'} ${t.operator} ${t.rightVar || '?'}`
                                        ) : t.name ? (
                                          `${t.name}${t.args ? `(${t.args})` : ''}`
                                        ) : (
                                          t.operator || 'Transformation'
                                        )}
                                      </div>
                                      
                                      {/* Values Map */}
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {t.operator && ['+', '-', '*', '/', '%'].includes(t.operator) ? (
                                          <span>{String(t.before ?? 'nil')} {t.operator} {String(t.rightValue ?? 'nil')}</span>
                                        ) : (
                                          <span>{String(t.before ?? 'nil')}</span>
                                        )}
                                        <span style={{ opacity: 0.5 }}>→</span>
                                        <span style={{ color: 'var(--green)', fontWeight: 700 }}>{String(t.after ?? 'nil')}</span>
                                      </div>
                                    </div>
                                  </div>
                              ))}
                              {/* Final result node */}
                              <div style={{ position: 'relative', paddingLeft: 20 }}>
                                <div style={{ 
                                  position: 'absolute', 
                                  left: 0, 
                                  top: 4, 
                                  width: 10, 
                                  height: 10, 
                                  borderRadius: '50%', 
                                  background: 'var(--green)', 
                                  border: '2px solid var(--bg-surface)'
                                }} />
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase' }}>Final Value</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Rich Data View (TreeView) */}
                        {(evalResult.typeName === 'Hash' || evalResult.typeName === 'Array' || detectFormat(evalResult.value ?? '') !== 'text') && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                              Structure Details
                            </div>
                            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: 10, maxHeight: 300, overflowY: 'auto' }}>
                              <TreeView data={tryParseJson(evalResult.value ?? '') || evalResult.value} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
                {!evalResult && loaded && (
                  <EmptyState icon={<Zap size={24} />} message="Ready to evaluate" sub="Enter a Liquid expression above" />
                )}
                {!loaded && (
                  <EmptyState icon={<Lock size={24} />} message="Debugger inactive" sub="Load a template to start evaluating" />
                )}
              </div>
            </motion.div>
          )}

          {/* Problems */}
          {activeTab === 'problems' && (
            <motion.div
              key="problems"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              {validationErrors.length === 0 ? (
                <EmptyState icon={<CheckCircle size={24} />} message="No syntax issues found" sub="Everything looks good for DotLiquid" />
              ) : (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {validationErrors.map((err, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid var(--border-primary)',
                        background: err.severity === 'error' ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <Circle size={8} fill="currentColor" stroke="none" style={{ color: 'var(--red)', marginTop: 4 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
                            {err.message}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                            Line {err.line}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
