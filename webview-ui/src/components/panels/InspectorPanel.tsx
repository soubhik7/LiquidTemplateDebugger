import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Play, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AnimatedButton } from '../shared/AnimatedButton';
import { EmptyState } from '../shared/EmptyState';
import { expandDown } from '../../utils/animation';
import { truncate, formatRawValue } from '../../utils/helpers';
import type { InspectorTab, WatchExpression } from '../../types/app';

interface InspectorPanelProps {
  onAddWatch: (expr: string) => void;
  onRemoveWatch: (id: number) => void;
  onToggleBreakpoint: (id: number) => void;
  onRemoveBreakpoint: (id: number) => void;
  onEvaluate: (expr: string) => Promise<{ value?: string; typeName?: string; error?: string }>;
}

const TABS: { id: InspectorTab; label: string }[] = [
  { id: 'watches', label: 'Watches' },
  { id: 'breakpoints', label: 'Breakpoints' },
  { id: 'eval', label: 'Evaluate' },
];

export function InspectorPanel({
  onAddWatch,
  onRemoveWatch,
  onToggleBreakpoint,
  onRemoveBreakpoint,
  onEvaluate,
}: InspectorPanelProps) {
  const debugState = useAppStore((s) => s.debugState);
  const activeTab = useAppStore((s) => s.activeInspectorTab);
  const setTab = useAppStore((s) => s.setInspectorTab);
  const expandedWatches = useAppStore((s) => s.expandedWatches);
  const toggleWatchExpand = useAppStore((s) => s.toggleWatchExpand);

  const [watchInput, setWatchInput] = useState('');
  const [evalInput, setEvalInput] = useState('');
  const [evalResult, setEvalResult] = useState<{ value?: string; typeName?: string; error?: string } | null>(null);

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
    setEvalResult(r);
  }, [evalInput, loaded, onEvaluate]);

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
                  <EmptyState icon="👁" message="No watches" sub="Add an expression above" />
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
                                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                                  {w.displayExpression ?? w.expression}
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: '5px 8px',
                                  fontFamily: 'var(--font-mono)',
                                  color: w.hasChanged ? 'var(--yellow)' : 'var(--text-secondary)',
                                  fontWeight: w.hasChanged ? 700 : 400,
                                  maxWidth: 140,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={w.currentValue ?? 'nil'}
                              >
                                {truncate(w.currentValue ?? 'nil', 30)}
                              </td>
                              <td style={{ padding: '5px 4px', width: 20 }}>
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
                                      <pre
                                        style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 120, overflowY: 'auto' }}
                                        dangerouslySetInnerHTML={{ __html: formatRawValue(w.rawValue) }}
                                      />
                                      {w.typeName && (
                                        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                                          Type: <span style={{ color: 'var(--cyan)' }}>{w.typeName}</span>
                                        </p>
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
                  icon="🔴"
                  message="No breakpoints set"
                  sub="Click the gutter in the template panel to add one"
                />
              ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {breakpoints.map((bp) => (
                    <motion.li
                      key={bp.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 10px',
                        borderBottom: '1px solid var(--border-primary)',
                        fontSize: 12,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
                    >
                      <button
                        onClick={() => onToggleBreakpoint(bp.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0 }}
                        title={bp.isEnabled ? 'Disable' : 'Enable'}
                      >
                        <span style={{ color: bp.isEnabled ? 'var(--bp-color)' : 'var(--text-muted)', opacity: bp.isEnabled ? 1 : 0.4 }}>●</span>
                      </button>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--bp-color)', fontWeight: 600 }}>
                        Line {bp.line}
                      </span>
                      {bp.condition && (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 11 }}>
                          if {bp.condition}
                        </span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
                        hits: {bp.hitCount}
                      </span>
                      <button
                        onClick={() => onRemoveBreakpoint(bp.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
                      >
                        <X size={11} />
                      </button>
                    </motion.li>
                  ))}
                </ul>
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

              <div style={{ flex: 1, padding: '8px 10px', overflowY: 'auto' }}>
                {evalResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      padding: '8px 10px',
                      background: 'var(--bg-primary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-primary)',
                    }}
                  >
                    {evalResult.error ? (
                      <span style={{ color: 'var(--red)' }}>Error: {evalResult.error}</span>
                    ) : (
                      <>
                        <span style={{ color: 'var(--text-muted)' }}>{'=> '}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{evalResult.value ?? 'nil'}</span>
                        {evalResult.typeName && (
                          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>({evalResult.typeName})</span>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
                {!loaded && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    Load a template to evaluate expressions
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
