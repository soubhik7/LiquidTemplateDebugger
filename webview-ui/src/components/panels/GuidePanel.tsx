import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Book, Code, ExternalLink, Hash, Info, Lightbulb, 
  PlayCircle, Star, Copy, Check, ChevronRight, X,
  Type, Calculator, Calendar, List, Zap, HelpCircle, Eye,
  BookOpen, FileText, Layers, ChevronDown, Terminal
} from 'lucide-react';
import { LIQUID_GUIDE, type LiquidFilter, type LiquidTheorySection } from '../../data/liquidGuide';

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
  const [activeTab, setActiveTab] = useState<'theory' | 'filters' | 'tags' | 'references'>('theory');
  const [selectedItem, setSelectedItem] = useState<{ type: 'filter' | 'tag' | 'theory', data: any } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const filteredTheory = useMemo(() => {
    const s = search.toLowerCase();
    return LIQUID_GUIDE.theory.filter(section => 
      section.title.toLowerCase().includes(s) || 
      section.content.toLowerCase().includes(s) ||
      section.subsections.some(sub => 
        sub.title.toLowerCase().includes(s) || 
        sub.content.toLowerCase().includes(s)
      )
    );
  }, [search]);

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

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
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
                <Book size={20} strokeWidth={1.5} />
              </div>
              <span style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Liquid Guide</span>
            </h2>
          </div>
          
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} strokeWidth={1.5} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documentation..."
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 44px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-xl)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  transition: 'all 0.2s ease'
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
              minWidth: 400
            }}>
              {(['theory', 'filters', 'tags', 'references'] as const).map((tab) => (
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
            {activeTab === 'theory' && (
              <motion.div
                key="theory"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                {filteredTheory.map((section) => (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: 'var(--radius-xl)',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {/* Section Header */}
                    <motion.div
                      whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      onClick={() => setSelectedItem({ type: 'theory', data: section })}
                      style={{
                        padding: '28px 32px',
                        cursor: 'pointer',
                        background: 'var(--bg-surface)',
                        borderBottom: '1px solid var(--border-primary)',
                        position: 'relative',
                        zIndex: 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <div style={{
                              padding: '5px 12px',
                              background: 'var(--accent-bg)',
                              color: 'var(--accent)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 10,
                              fontWeight: 900,
                              letterSpacing: '1px',
                              textTransform: 'uppercase'
                            }}>
                              {section.id}
                            </div>
                            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px', fontFamily: 'Inter, system-ui, sans-serif' }}>
                              {section.title}
                            </h3>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                              <BookOpen size={12} strokeWidth={1.5} />
                              {section.readTime}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                              • {section.subsections.length} Key Concepts
                            </div>
                          </div>
                          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, fontWeight: 500, fontFamily: 'Inter, system-ui, sans-serif' }}>
                            {section.content.substring(0, 160)}...
                          </p>
                        </div>
                        <div style={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: '50%', 
                          background: 'var(--bg-panel)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: 'var(--accent)',
                          border: '1px solid var(--border-primary)',
                          transition: 'all 0.2s ease'
                        }}>
                          <ChevronRight size={20} strokeWidth={1.5} />
                        </div>
                      </div>
                    </motion.div>

                    {/* Subsections Preview */}
                    <div style={{ padding: '16px 28px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                        {section.subsections.slice(0, 4).map((sub) => (
                          <div
                            key={sub.id}
                            onClick={() => setSelectedItem({ type: 'theory', data: section })}
                            style={{
                              padding: '12px',
                              background: 'var(--bg-hover)',
                              border: '1px solid var(--border-primary)',
                              borderRadius: 'var(--radius-lg)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'var(--accent)';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'var(--border-primary)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--accent)', marginBottom: 4, letterSpacing: '0.5px' }}>
                              {sub.id}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                              {sub.title}
                            </div>
                          </div>
                        ))}
                      </div>
                      {section.subsections.length > 4 && (
                        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                          +{section.subsections.length - 4} more subsections
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

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
              width: selectedItem.type === 'theory' ? 600 : 450,
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
                  {selectedItem.type === 'filter' ? selectedItem.data.category : selectedItem.type === 'theory' ? selectedItem.data.id : 'Logic Tag'}
                </div>
                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px' }}>
                  {selectedItem.data.name || selectedItem.data.title}
                </h3>
                {selectedItem.type === 'theory' && (
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BookOpen size={12} />
                    {selectedItem.data.readTime}
                  </div>
                )}
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                style={{ padding: 8, borderRadius: '50%', background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
              {selectedItem.type === 'theory' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                    {selectedItem.data.content}
                  </p>

                  {/* Subsections */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {selectedItem.data.subsections.map((sub: any) => (
                      <div key={sub.id} style={{
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-xl)',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          padding: '16px 20px',
                          background: 'var(--bg-hover)',
                          borderBottom: '1px solid var(--border-primary)'
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--accent)', marginBottom: 4, letterSpacing: '0.5px' }}>
                            {sub.id}
                          </div>
                          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                            {sub.title}
                          </h4>
                        </div>
                        <div style={{ padding: '20px' }}>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0, marginBottom: sub.examples ? 20 : 0 }}>
                            {sub.content}
                          </p>

                          {/* Examples */}
                          {sub.examples && sub.examples.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                              {sub.examples.map((example: any, idx: number) => (
                                <div key={idx} style={{
                                  background: 'var(--bg-surface)',
                                  border: '1px solid var(--border-primary)',
                                  borderRadius: 'var(--radius-lg)',
                                  overflow: 'hidden'
                                }}>
                                  {example.description && (
                                    <div style={{
                                      padding: '10px 14px',
                                      background: 'var(--accent-soft)',
                                      borderBottom: '1px solid var(--border-primary)',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: 'var(--accent)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 6
                                    }}>
                                      <Terminal size={12} />
                                      {example.description}
                                    </div>
                                  )}
                                  <div style={{ padding: '14px' }}>
                                    <div style={{ marginBottom: 12 }}>
                                      <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                                        Data
                                      </div>
                                      <code style={{
                                        display: 'block',
                                        padding: '10px',
                                        background: 'var(--bg-panel)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 11,
                                        fontFamily: 'var(--font-mono)',
                                        color: 'var(--green)',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all'
                                      }}>
                                        {example.data}
                                      </code>
                                    </div>
                                    <div style={{ marginBottom: 12 }}>
                                      <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                                        Template
                                      </div>
                                      <code style={{
                                        display: 'block',
                                        padding: '10px',
                                        background: 'var(--bg-panel)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 11,
                                        fontFamily: 'var(--font-mono)',
                                        color: 'var(--accent)',
                                        whiteSpace: 'pre-wrap'
                                      }}>
                                        {example.template}
                                      </code>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                                        Output
                                      </div>
                                      <code style={{
                                        display: 'block',
                                        padding: '10px',
                                        background: 'rgba(16,185,129,0.05)',
                                        border: '1px solid var(--green)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 11,
                                        fontFamily: 'var(--font-mono)',
                                        color: 'var(--green)',
                                        fontWeight: 600,
                                        whiteSpace: 'pre-wrap'
                                      }}>
                                        {example.output}
                                      </code>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
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
                            <div style={{ padding: '12px', background: 'rgba(16,185,129,0.05)', color: 'var(--green)', borderRadius: 'var(--radius-md)', border: '1px solid var(--green)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 800 }}>
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
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Made with Bob
