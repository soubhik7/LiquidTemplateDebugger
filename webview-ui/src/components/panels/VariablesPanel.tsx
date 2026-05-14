import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  BarChart3, 
  Hash, 
  Target, 
  FlaskConical 
} from 'lucide-react';
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

  // Deep search helper
  const matchesSearch = (obj: any, query: string): boolean => {
    if (!obj) return false;
    const q = query.toLowerCase();
    
    if (typeof obj === 'string') return obj.toLowerCase().includes(q);
    if (typeof obj === 'number') return String(obj).includes(q);
    
    if (Array.isArray(obj)) {
      return obj.some(item => matchesSearch(item, query));
    }
    
    if (typeof obj === 'object') {
      return Object.entries(obj).some(([key, val]) => 
        key.toLowerCase().includes(q) || matchesSearch(val, query)
      );
    }
    
    return false;
  };

  const filtered = varFilter
    ? variables.filter(
        (v) =>
          v.name.toLowerCase().includes(varFilter.toLowerCase()) ||
          matchesSearch(v.rawValue, varFilter)
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
        background: 'var(--bg-surface)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 16px',
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-primary)',
          flexShrink: 0,
          height: 36
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', lineHeight: 1 }}>
          Variables
        </span>
        {variables.length > 0 && (
            <span
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 20,
                background: varFilter ? 'var(--accent)' : 'var(--accent-soft)',
                color: varFilter ? 'white' : 'var(--accent)',
                fontWeight: 800,
                lineHeight: 1,
                boxShadow: varFilter ? '0 0 10px var(--accent-soft)' : 'none'
              }}
            >
              {varFilter ? `${filtered.length} matches` : variables.length}
            </span>
        )}
        <div style={{ flex: 1 }} />
      </div>

      {/* Filter */}
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-primary)',
          flexShrink: 0,
          position: 'relative',
          height: 44,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Search size={12} style={{ position: 'absolute', left: 24, color: 'var(--text-muted)' }} />
        <input
          value={varFilter}
          onChange={(e) => setVarFilter(e.target.value)}
          placeholder="Filter variables…"
          style={{
            width: '100%',
            height: 32,
            padding: '0 12px 0 32px',
            fontSize: 12,
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-primary)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            outline: 'none',
            fontWeight: 600
          }}
        />
      </div>

      {/* Table */}
      <div>
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
                      <td style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, height: 36 }}>
                        <div style={{ width: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: expanded ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0, display: 'flex' }}>
                            {expanded ? <ChevronDown size={12} strokeWidth={3} /> : <ChevronRight size={12} />}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: expanded ? 'var(--accent)' : 'var(--text-primary)', fontSize: 12, lineHeight: 1 }}>
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
                          fontSize: 12,
                          lineHeight: 1
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
                                        <div key={idx} style={{ marginBottom: 12 }}>
                                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)' }}>
                                              {t.operator && ['+', '-', '*', '/', '%'].includes(t.operator) ? <Hash size={13} /> : 
                                               ['round', 'floor', 'ceil', 'abs'].includes(t.operator || '') ? <Target size={13} /> : <FlaskConical size={13} />}
                                            </span>
                                            {t.name || (t.operator ? t.operator.toUpperCase() : 'STEP')}
                                          </div>

                                          <div
                                            style={{
                                              padding: '8px 12px',
                                              background: 'var(--bg-panel)',
                                              border: '1px solid var(--border-primary)',
                                              borderRadius: 8,
                                              fontFamily: 'var(--font-mono)',
                                              boxShadow: 'var(--shadow-sm)',
                                            }}
                                          >
                                            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginBottom: 2 }}>
                                              {v.name} = {idx === 0 ? (t.baseExpr ?? 'val') : 'result'} {t.operator ? t.operator : ''} {t.rightVar ? t.rightVar : (t.name || '')}
                                            </div>
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
