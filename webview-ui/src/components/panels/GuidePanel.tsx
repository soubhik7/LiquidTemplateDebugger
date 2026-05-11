import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Book, Code, ExternalLink, Hash, Info, Lightbulb, 
  PlayCircle, Star, Copy, Check, ChevronDown, ChevronRight,
  Type, Calculator, Calendar, List, Zap, HelpCircle
} from 'lucide-react';
import { LIQUID_GUIDE, type LiquidFilter } from '../../data/liquidGuide';

const CATEGORY_ICONS: Record<string, any> = {
  'String': Type,
  'Math': Calculator,
  'Date': Calendar,
  'Array': List,
  'Logic': Zap,
  'Other': HelpCircle
};

export function GuidePanel() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'filters' | 'tags' | 'references'>('filters');
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['String', 'Math']));

  const toggleCategory = (cat: string) => {
    const next = new Set(expandedCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setExpandedCategories(next);
  };

  const filteredFilters = useMemo(() => {
    return LIQUID_GUIDE.filters.filter(f => 
      f.name.toLowerCase().includes(search.toLowerCase()) || 
      f.category.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const groupedFilters = useMemo(() => {
    const groups: Record<string, LiquidFilter[]> = {};
    filteredFilters.forEach(f => {
      if (!groups[f.category]) groups[f.category] = [];
      groups[f.category].push(f);
    });
    return groups;
  }, [filteredFilters]);

  const filteredTags = LIQUID_GUIDE.tags.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-primary)',
      }}
    >
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-primary)', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 6, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Book size={20} />
            </div>
            Liquid Guide
          </h2>
        </div>
        
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filters, tags, descriptions..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              fontSize: 13,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-primary)',
              outline: 'none',
              boxShadow: 'var(--shadow-sm)',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-primary)'}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, background: 'var(--bg-hover)', padding: 4, borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-secondary)' }}>
          {(['filters', 'tags', 'references'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '8px 0',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: activeTab === tab ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                boxShadow: activeTab === tab ? 'var(--shadow-md)' : 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 24px' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'filters' && (
            <motion.div
              key="filters"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
            >
              {Object.entries(groupedFilters).map(([category, filters]) => {
                const Icon = CATEGORY_ICONS[category] || HelpCircle;
                const isExpanded = expandedCategories.has(category);
                
                return (
                  <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div 
                      onClick={() => toggleCategory(category)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '4px 0',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon size={14} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          {category}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>({filters.length})</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}
                        >
                          {filters.map((f) => (
                            <div
                              key={f.name}
                              style={{
                                padding: '14px 18px',
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-xl)',
                                boxShadow: selectedFilter === f.name ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                            >
                              <div 
                                onClick={() => setSelectedFilter(selectedFilter === f.name ? null : f.name)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                              >
                                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{f.name}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleCopy(f.syntax, f.name); }}
                                    style={{
                                      background: 'var(--bg-hover)',
                                      border: '1px solid var(--border-secondary)',
                                      borderRadius: 6,
                                      padding: 4,
                                      cursor: 'pointer',
                                      color: copiedId === f.name ? 'var(--green)' : 'var(--text-muted)',
                                      transition: 'all 0.2s'
                                    }}
                                    title="Copy syntax"
                                  >
                                    {copiedId === f.name ? <Check size={12} /> : <Copy size={12} />}
                                  </button>
                                  <ChevronDown 
                                    size={16} 
                                    style={{ 
                                      color: 'var(--text-muted)', 
                                      transform: selectedFilter === f.name ? 'rotate(180deg)' : 'none',
                                      transition: 'transform 0.3s ease'
                                    }} 
                                  />
                                </div>
                              </div>

                              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: 1.5 }}>
                                {f.description}
                              </p>

                              <AnimatePresence>
                                {selectedFilter === f.name && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    style={{ overflow: 'hidden' }}
                                  >
                                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                      <div style={{ background: 'var(--bg-panel)', padding: 14, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-secondary)', position: 'relative' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>
                                          <Code size={12} /> Syntax Example
                                        </div>
                                        <code style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 12 }}>{f.syntax}</code>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                          <div>
                                            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Input</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-primary)', background: 'var(--bg-surface)', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-primary)' }}>
                                              {f.input}
                                            </div>
                                          </div>
                                          <div>
                                            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Output</div>
                                            <div style={{ fontSize: 11, color: 'var(--green)', background: 'rgba(16,185,129,0.05)', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--green-soft)' }}>
                                              {f.output}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div style={{ background: 'rgba(6,182,212,0.03)', padding: 14, borderRadius: 'var(--radius-lg)', borderLeft: '3px solid var(--cyan)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, color: 'var(--cyan)', marginBottom: 6, textTransform: 'uppercase' }}>
                                          <Lightbulb size={12} /> Pro Tip & Advantages
                                        </div>
                                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{f.advantages}</p>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>
          )}

          {activeTab === 'tags' && (
            <motion.div
              key="tags"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {filteredTags.map((t) => (
                <div key={t.name} style={{ padding: '18px', background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ padding: 6, borderRadius: 6, background: 'rgba(234,179,8,0.1)', color: 'var(--yellow)' }}>
                      <Star size={16} />
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 16 }}>{t.name}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>{t.description}</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ background: 'var(--bg-panel)', padding: 12, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                        Syntax
                      </div>
                      <code style={{ fontSize: 11, color: 'var(--purple)', fontFamily: 'var(--font-mono)' }}>{t.syntax}</code>
                    </div>
                    
                    <div style={{ background: 'var(--bg-panel)', padding: 12, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                        Real-world Example
                      </div>
                      <code style={{ fontSize: 11, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>{t.example}</code>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'references' && (
            <motion.div
              key="references"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {LIQUID_GUIDE.references.map((r) => (
                <a
                  key={r.title}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-xl)',
                    textDecoration: 'none',
                    transition: 'all 0.25s',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.borderColor = 'var(--accent)'; 
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.borderColor = 'var(--border-primary)'; 
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ padding: 6, borderRadius: 6, background: 'var(--bg-hover)' }}>
                      <ExternalLink size={14} style={{ color: 'var(--accent)' }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{r.title}</span>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </a>
              ))}
              
              <motion.div 
                whileHover={{ scale: 1.01 }}
                style={{ marginTop: 24, padding: 20, background: 'var(--accent-soft)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--accent)', position: 'relative', overflow: 'hidden' }}
              >
                <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1 }}>
                  <PlayCircle size={80} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', marginBottom: 10 }}>
                  <PlayCircle size={20} />
                  <span style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Power User Tip</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, lineHeight: 1.6, position: 'relative', zIndex: 1 }}>
                  Combine multiple filters like <code>{"{{ item.name | Strip | Capitalize }}"}</code> to transform data in a single line. Use the <strong>Variables</strong> panel to see the transformation history!
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
