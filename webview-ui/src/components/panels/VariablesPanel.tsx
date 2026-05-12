import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { EmptyState } from '../shared/EmptyState';
import { expandDown } from '../../utils/animation';
import { truncate, formatRawValue, getScopeColor } from '../../utils/helpers';
import type { TrackedVariable } from '../../types/app';

export function VariablesPanel() {
  const debugState = useAppStore((s) => s.debugState);
  const expandedVars = useAppStore((s) => s.expandedVars);
  const toggleVarExpand = useAppStore((s) => s.toggleVarExpand);
  const varFilter = useAppStore((s) => s.varFilter);
  const setVarFilter = useAppStore((s) => s.setVarFilter);

  const variables = debugState?.state?.variables ?? [];
  const loaded = !!debugState?.isLoaded;

  const filtered = varFilter
    ? variables.filter(
        (v) =>
          v.name.toLowerCase().includes(varFilter.toLowerCase()) ||
          (v.currentValue ?? '').toLowerCase().includes(varFilter.toLowerCase())
      )
    : variables;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
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
          Variables
        </span>
        {variables.length > 0 && (
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
            {variables.length}
          </span>
        )}
        <div style={{ flex: 1 }} />
      </div>

      {/* Filter */}
      <div
        style={{
          padding: '5px 8px',
          borderBottom: '1px solid var(--border-primary)',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <Search size={11} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          value={varFilter}
          onChange={(e) => setVarFilter(e.target.value)}
          placeholder="Filter variables…"
          style={{
            width: '100%',
            padding: '3px 8px 3px 24px',
            fontSize: 12,
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!loaded || variables.length === 0 ? (
          <EmptyState icon={<BarChart3 size={24} />} message={loaded ? 'No variables in scope' : 'Variables will appear here'} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Search size={24} />} message="No matches" sub={`Searching for "${varFilter}"`} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Name', 'Scope', 'Value', 'Type'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '4px 10px',
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                      borderBottom: '1px solid var(--border-primary)',
                      position: 'sticky',
                      top: 0,
                      background: 'var(--bg-panel)',
                      zIndex: 1,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v: TrackedVariable) => {
                const expanded = expandedVars.has(v.name);
                const scopeColor = getScopeColor(v.scopeTag);

                return (
                  <React.Fragment key={v.name}>
                    <tr
                      onClick={() => toggleVarExpand(v.name)}
                      style={{
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-primary)',
                        transition: 'background var(--transition-fast)',
                        background: expanded ? 'var(--bg-active)' : 'transparent'
                      }}
                      onMouseEnter={(e) => { if (!expanded) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={(e) => { if (!expanded) (e.currentTarget as HTMLElement).style.background = ''; }}
                    >
                      <td style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: expanded ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}>
                          {expanded ? <ChevronDown size={12} strokeWidth={3} /> : <ChevronRight size={12} />}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: expanded ? 'var(--accent)' : 'var(--text-primary)', fontSize: 13 }}>
                          {v.name}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span
                          className={`scope-badge scope-${v.scopeTag ?? ''}`}
                          style={{ 
                            color: scopeColor, 
                            background: `rgba(var(--${v.scopeTag}-rgb, 100, 100, 100), 0.1)`,
                            borderColor: scopeColor,
                            border: '1px solid',
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontSize: 9,
                            fontWeight: 900
                          }}
                        >
                          {(v.scopeTag ?? '').toUpperCase()}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '8px 12px',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-primary)',
                          fontWeight: 700,
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 13
                        }}
                        title={v.currentValue ?? ''}
                      >
                        {truncate(v.currentValue, 40)}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                        {v.typeName}
                      </td>
                    </tr>

                    <AnimatePresence>
                      {expanded && (
                        <tr key={`${v.name}-detail`}>
                          <td colSpan={4} style={{ padding: 0 }}>
                            <motion.div
                              variants={expandDown}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              style={{
                                background: 'var(--bg-primary)',
                                borderLeft: '2px solid var(--accent)',
                                margin: '2px 10px 6px',
                                borderRadius: 'var(--radius-sm)',
                                padding: '8px 12px',
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
                                    maxHeight: 160,
                                    overflowY: 'auto',
                                    marginTop: 4,
                                  }}
                                  dangerouslySetInnerHTML={{ __html: formatRawValue(v.rawValue) }}
                                />
                              </div>

                              {v.origin && (
                                <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
                                  Origin: <span style={{ color: 'var(--green)' }}>{v.origin.sourcePath}</span>
                                  {v.origin.sourceFormat && ` (${v.origin.sourceFormat})`}
                                </p>
                              )}

                                  {v.transformations && v.transformations.length > 0 && (
                                    <div style={{ marginTop: 10 }}>
                                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6, display: 'block' }}>
                                        Transformations
                                      </span>
                                      {v.transformations.map((t, idx) => (
                                        <div
                                          key={idx}
                                          style={{
                                            marginTop: 6,
                                            padding: '8px 12px',
                                            background: 'var(--bg-panel)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 8,
                                            fontFamily: 'var(--font-mono)',
                                            boxShadow: 'var(--shadow-sm)',
                                          }}
                                        >
                                          {/* Expression Line */}
                                          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginBottom: 2 }}>
                                            {v.name} = {idx === 0 ? (t.baseExpr ?? 'val') : 'result'} {t.operator ? t.operator : ''} {t.rightVar ? t.rightVar : (t.name || '')}
                                          </div>
                                          {/* Calculation Line */}
                                          <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                            <span style={{ color: 'var(--red)' }}>
                                              {String(t.before ?? 'nil')} {t.operator ? t.operator : ''} {t.rightValue !== undefined ? String(t.rightValue) : ''}
                                            </span>
                                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                                            <span style={{ color: 'var(--green)', fontWeight: 800 }}>
                                              {String(t.after ?? 'nil')}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                              {v.history && v.history.length > 0 && (
                                <div style={{ marginTop: 6 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                    History
                                  </span>
                                  {v.history.map((h, idx) => (
                                    <div
                                      key={idx}
                                      style={{
                                        marginTop: 4,
                                        padding: '4px 8px',
                                        background: 'var(--bg-surface)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: 11,
                                        fontFamily: 'var(--font-mono)',
                                      }}
                                    >
                                      <span style={{ color: 'var(--purple)' }}>[LINE {h.line}]</span>
                                      <br />
                                      <span style={{ color: 'var(--red)', textDecoration: 'line-through' }}>
                                        {String(h.oldValue ?? h.before ?? 'nil')}
                                      </span>
                                      {' → '}
                                      <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                                        {String(h.newValue ?? h.after ?? 'nil')}
                                      </span>
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
  );
}
