import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Book, Code, ExternalLink, Hash, Info, Lightbulb, 
  PlayCircle, Star, Copy, Check, ChevronRight, X,
  Type, Calculator, Calendar, List, Zap, HelpCircle, Eye
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
  const [selectedItem, setSelectedItem] = useState<{ type: 'filter' | 'tag', data: any } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredFilters = useMemo(() => {
    const s = search.toLowerCase();
    return LIQUID_GUIDE.filters.filter(f => 
      f.name.toLowerCase().includes(s) || 
      f.category.toLowerCase().includes(s) ||
      f.description.toLowerCase().includes(s)
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
    <div style={{
      display: 'flex',
      height: '100%',
      background: 'var(--bg-panel)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Main List Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        borderRight: selectedItem ? '1px solid var(--border-primary)' : 'none',
        transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
      }}>
        {/* Sticky Header */}
        <div style={{ 
          padding: '24px 32px', 
          background: 'var(--bg-surface)', 
          zIndex: 20,
          position: 'sticky',
          top: 0,
          borderBottom: '1px solid var(--border-primary)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 12, letterSpacing: '-0.5px' }}>
              <div style={{ 
                padding: 7, 
                borderRadius: 10, 
                background: 'linear-gradient(135deg, var(--accent), var(--purple))', 
                color: 'white',
                boxShadow: '0 4px 12px var(--accent-soft)'
              }}>
                <Book size={20} strokeWidth={2.5} />
              </div>
              Liquid Guide
            </h2>
          </div>
          
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)', opacity: 0.8 }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documentation..."
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 44px',
                  fontSize: 13,
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ 
              display: 'flex', 
              gap: 4, 
              background: 'var(--bg-hover)', 
              padding: 4, 
              borderRadius: 'var(--radius-xl)', 
              border: '1px solid var(--border-primary)',
              minWidth: 320
            }}>
              {(['filters', 'tags', 'references'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    background: activeTab === tab ? 'var(--accent)' : 'transparent',
                    color: activeTab === tab ? 'white' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    boxShadow: activeTab === tab ? 'var(--shadow-md)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'filters' && (
              <motion.div
                key="filters"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 40 }}
              >
                {Object.entries(groupedFilters).map(([category, filters]) => {
                  const Icon = CATEGORY_ICONS[category] || HelpCircle;
                  return (
                    <div key={category}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--border-primary)', paddingBottom: 8 }}>
                        <Icon size={14} style={{ color: 'var(--accent)' }} strokeWidth={2.5} />
                        <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>
                          {category}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.5 }}>{filters.length}</span>
                      </div>

                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                        gap: 16 
                      }}>
                        {filters.map((f) => (
                          <motion.div
                            key={f.name}
                            whileHover={{ y: -4, borderColor: 'var(--accent)', boxShadow: 'var(--shadow-md)' }}
                            onClick={() => setSelectedItem({ type: 'filter', data: f })}
                            style={{
                              padding: '16px',
                              background: selectedItem?.data.name === f.name ? 'var(--accent-soft)' : 'var(--bg-surface)',
                              border: '1px solid',
                              borderColor: selectedItem?.data.name === f.name ? 'var(--accent)' : 'var(--border-primary)',
                              borderRadius: 'var(--radius-lg)',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{f.name}</span>
                              <Eye size={12} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, opacity: 0.8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {f.description}
                            </p>
                          </motion.div>
                        ))}
                      </div>
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
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
                  gap: 16 
                }}
              >
                {filteredTags.map((t) => (
                  <motion.div 
                    key={t.name}
                    whileHover={{ y: -4, borderColor: 'var(--accent)' }}
                    onClick={() => setSelectedItem({ type: 'tag', data: t })}
                    style={{ 
                      padding: '20px', 
                      background: 'var(--bg-surface)', 
                      border: '1px solid var(--border-primary)', 
                      borderRadius: 'var(--radius-xl)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <Star size={16} fill="var(--yellow)" stroke="none" />
                      <span style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: 14 }}>{t.name}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, opacity: 0.8 }}>{t.description}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {activeTab === 'references' && (
              <motion.div
                key="references"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                {LIQUID_GUIDE.references.map((r) => (
                  <a key={r.title} href={r.url} target="_blank" rel="noopener noreferrer" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', background: 'var(--bg-surface)', border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-xl)', textDecoration: 'none', color: 'inherit'
                  }}>
                    <span style={{ fontWeight: 700 }}>{r.title}</span>
                    <ExternalLink size={14} style={{ color: 'var(--accent)' }} />
                  </a>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Side Drawer Detail View */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              width: 450,
              height: '100%',
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-primary)',
              zIndex: 30,
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 4 }}>
                  {selectedItem.type === 'filter' ? selectedItem.data.category : 'Logic Tag'}
                </div>
                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px' }}>{selectedItem.data.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                style={{ padding: 8, borderRadius: '50%', background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 32 }}>
                {selectedItem.data.description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      <Code size={14} /> Usage Syntax
                    </div>
                    <button 
                      onClick={() => handleCopy(selectedItem.data.syntax, 'detail')}
                      style={{ fontSize: 10, fontWeight: 700, color: copiedId === 'detail' ? 'var(--green)' : 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {copiedId === 'detail' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === 'detail' ? 'Copied!' : 'Copy Snippet'}
                    </button>
                  </div>
                  <code style={{ 
                    display: 'block', padding: '16px', background: 'var(--bg-panel)', border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-lg)', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 14,
                    fontWeight: 600, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {selectedItem.data.syntax}
                  </code>
                </section>

                {selectedItem.type === 'filter' ? (
                  <>
                    <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Input</div>
                        <div style={{ padding: '12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                          {selectedItem.data.input}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Output</div>
                        <div style={{ padding: '12px', background: 'rgba(16,185,129,0.05)', color: 'var(--green)', borderRadius: 'var(--radius-md)', border: '1px solid var(--green-soft)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800 }}>
                          {selectedItem.data.output}
                        </div>
                      </div>
                    </section>

                    <section style={{ background: 'var(--accent-soft)', padding: '20px', borderRadius: 'var(--radius-xl)', borderLeft: '4px solid var(--accent)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontWeight: 900, fontSize: 11, textTransform: 'uppercase', marginBottom: 8 }}>
                        <Lightbulb size={14} /> Pro Tip
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{selectedItem.data.advantages}</p>
                    </section>
                  </>
                ) : (
                  <section>
                    <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Real-world Example</div>
                    <code style={{ 
                      display: 'block', padding: '16px', background: 'var(--bg-panel)', border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-lg)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 12,
                      whiteSpace: 'pre-wrap', lineHeight: 1.6
                    }}>
                      {selectedItem.data.example}
                    </code>
                  </section>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
