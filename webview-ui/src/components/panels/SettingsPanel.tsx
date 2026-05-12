import { motion } from 'framer-motion';
import { useAppStore, getAccentHex } from '../../store/useAppStore';
import { Palette, Sun, Moon, Info, Github, Sparkles, Check, Monitor, Layout, ExternalLink, Pipette } from 'lucide-react';
import { ACCENT_COLORS } from '../../utils/constants';
import type { Theme } from '../../types/app';
import { useRef, useState } from 'react';
import { AISettingsSection } from './AISettingsSection';

const THEMES: { id: Theme; label: string; icon: any; colors: string[] }[] = [
  { id: 'dark', label: 'Dark Default', icon: Moon, colors: ['#0a0a12', '#16161f'] },
  { id: 'midnight', label: 'Midnight', icon: Moon, colors: ['#02040a', '#0d1117'] },
  { id: 'dark-cool', label: 'Cool Blue', icon: Monitor, colors: ['#060810', '#0f162c'] },
  { id: 'dark-warm', label: 'Warm Wood', icon: Sun, colors: ['#0d0906', '#1c1209'] },
  { id: 'glass-dark', label: 'Glass Dark', icon: Sparkles, colors: ['#030712', 'rgba(31, 41, 55, 0.5)'] },
  { id: 'light', label: 'Light Clean', icon: Sun, colors: ['#f0f2f5', '#f8fafc'] },
  { id: 'light-cool', label: 'Iceberg', icon: Monitor, colors: ['#eef4fb', '#f0f7ff'] },
  { id: 'light-warm', label: 'Seashell', icon: Sun, colors: ['#fdf6ee', '#fff8f2'] },
  { id: 'glass-light', label: 'Glass Light', icon: Sparkles, colors: ['#f8fafc', 'rgba(241, 245, 249, 0.6)'] },
];

function ThemePreview({ colors, active }: { colors: string[], active: boolean }) {
  return (
    <div style={{ 
      height: 70, 
      borderRadius: 12, 
      background: colors[0], 
      marginBottom: 12, 
      overflow: 'hidden',
      position: 'relative',
      border: active ? '2px solid var(--accent)' : '1px solid var(--border-primary)',
      boxShadow: active ? '0 8px 24px -4px var(--accent-glow)' : 'inset 0 2px 10px rgba(0,0,0,0.05)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* Mini Sidebar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '22%', background: colors[1], borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ padding: '6px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 2, width: i === 1 ? '80%' : '50%', background: active ? 'var(--accent)' : 'currentColor', opacity: 0.2, borderRadius: 1 }} />
          ))}
        </div>
      </div>
      {/* Mini Header */}
      <div style={{ position: 'absolute', left: '22%', right: 0, top: 0, height: '18%', background: colors[1], borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', padding: '0 6px', gap: 4 }}>
         <div style={{ height: 2, width: 20, background: 'var(--accent)', opacity: 0.4, borderRadius: 1 }} />
         <div style={{ marginLeft: 'auto', height: 4, width: 4, borderRadius: '50%', background: 'var(--green)', opacity: 0.6 }} />
      </div>
      {/* Mini Editor Content */}
      <div style={{ position: 'absolute', left: '26%', top: '28%', right: 8, bottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 2, width: '90%', background: 'var(--accent)', opacity: 0.1, borderRadius: 1 }} />
        <div style={{ height: 2, width: '60%', background: 'var(--accent)', opacity: 0.08, borderRadius: 1 }} />
        <div style={{ height: 2, width: '85%', background: 'var(--accent)', opacity: 0.1, borderRadius: 1 }} />
        <div style={{ height: 2, width: '40%', background: 'var(--accent)', opacity: 0.08, borderRadius: 1 }} />
      </div>

      {active && (
        <motion.div 
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          style={{ 
            position: 'absolute', 
            top: 6, 
            right: 6, 
            background: 'var(--accent)', 
            color: 'white', 
            borderRadius: '50%', 
            padding: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 10
          }}
        >
          <Check size={10} strokeWidth={4} />
        </motion.div>
      )}
    </div>
  );
}

type TabId = 'appearance' | 'ai' | 'about';

export function SettingsPanel() {
  const currentTheme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const accentColor = useAppStore((s) => s.accentColor);
  const setAccentColor = useAppStore((s) => s.setAccentColor);
  const [activeTab, setActiveTab] = useState<TabId>('appearance');
  const colorInputRef = useRef<HTMLInputElement>(null);

  const isCustomColor = accentColor.startsWith('#') && !ACCENT_COLORS.some(c => c.hex.toLowerCase() === accentColor.toLowerCase());
  const currentHex = getAccentHex(accentColor);

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'ai', label: 'AI Engine', icon: Sparkles },
    { id: 'about', label: 'About', icon: Info },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        flex: 1,
        padding: '32px 16px',
        background: 'var(--bg-primary)',
        overflowY: 'auto',
        color: 'var(--text-primary)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <div style={{ 
        width: '100%',
        maxWidth: 1000, 
        background: 'var(--bg-surface)', 
        borderRadius: 'var(--radius-2xl)', 
        border: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-2xl)',
        display: 'flex',
        minHeight: 600,
        overflow: 'hidden'
      }}>
        {/* Navigation Sidebar */}
        <div style={{ 
          width: 240, 
          background: 'var(--bg-panel)', 
          borderRight: '1px solid var(--border-primary)',
          padding: '32px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, padding: '0 8px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--accent), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 16px -4px var(--accent-glow)' }}>
              <Layout size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.5px' }}>Settings</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Configuration</div>
            </div>
          </div>

          {tabs.map(tab => (
            <motion.div
              key={tab.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 12,
                cursor: 'pointer',
                background: activeTab === tab.id ? 'var(--accent-bg)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                transition: 'all 0.2s',
                border: activeTab === tab.id ? '1px solid var(--accent-soft)' : '1px solid transparent'
              }}
            >
              <tab.icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
              <span style={{ fontSize: 14, fontWeight: activeTab === tab.id ? 800 : 600 }}>{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeIndicator"
                  style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)' }} 
                />
              )}
            </motion.div>
          ))}
          
          <div style={{ marginTop: 'auto', padding: '16px', borderRadius: 16, background: 'rgba(var(--bg-surface-rgb), 0.5)', border: '1px solid var(--border-primary)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 4, color: 'var(--text-primary)' }}>System Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <motion.div 
                animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} 
              />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.2px' }}>Operational</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, padding: '48px 56px', overflowY: 'auto', position: 'relative' }}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {activeTab === 'appearance' && (
              <>
                <header style={{ marginBottom: 48 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Appearance</h2>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500, margin: 0 }}>Customize your visual environment and theme preferences.</p>
                </header>

                <section style={{ marginBottom: 48 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <Palette size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Visual Themes</span>
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
                    gap: 16 
                  }}>
                    {THEMES.map((t) => (
                      <motion.div
                        key={t.id}
                        whileHover={{ y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setTheme(t.id)}
                        style={{
                          padding: '12px',
                          background: currentTheme === t.id ? 'var(--bg-active)' : 'var(--bg-hover)',
                          border: '1px solid',
                          borderColor: currentTheme === t.id ? 'var(--accent)' : 'var(--border-primary)',
                          borderRadius: 'var(--radius-lg)',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.2s ease',
                          boxShadow: currentTheme === t.id ? 'var(--shadow-md)' : 'none'
                        }}
                      >
                        <ThemePreview colors={t.colors} active={currentTheme === t.id} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                           <span style={{ fontSize: 12, fontWeight: 700, color: currentTheme === t.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {t.label}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>

                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <Sparkles size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>Accent Highlight</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                    {ACCENT_COLORS.map((c) => {
                      const isSelected = accentColor === c.value;
                      const isVeryLight = c.hex.toLowerCase() === '#fef08a' || c.hex.toLowerCase() === '#ffffff';
                      
                      return (
                        <motion.div
                          key={c.value}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setAccentColor(c.value as any)}
                          title={c.label}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: c.hex,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: isSelected ? '2px solid var(--text-primary)' : '2px solid transparent',
                            boxShadow: isSelected ? `0 0 16px -4px ${c.hex}` : '0 2px 8px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {isSelected && (
                            <Check size={16} strokeWidth={4} style={{ color: isVeryLight ? '#000' : '#fff' }} />
                          )}
                        </motion.div>
                      );
                    })}

                    <div style={{ width: 1, height: 24, background: 'var(--border-primary)', margin: '0 4px' }} />
                    
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="color"
                        ref={colorInputRef}
                        value={currentHex}
                        onChange={(e) => setAccentColor(e.target.value)}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                      />
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => colorInputRef.current?.click()}
                        style={{
                          padding: '8px 14px',
                          background: isCustomColor ? accentColor : 'var(--bg-hover)',
                          border: '1px solid',
                          borderColor: isCustomColor ? 'var(--text-primary)' : 'var(--border-primary)',
                          borderRadius: 10,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          color: isCustomColor ? '#fff' : 'var(--text-primary)',
                          boxShadow: isCustomColor ? `0 4px 12px -4px ${accentColor}` : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Pipette size={14} strokeWidth={2.5} />
                        <span style={{ fontSize: 12, fontWeight: 700 }}>
                          {isCustomColor ? accentColor.toUpperCase() : 'Custom'}
                        </span>
                      </motion.div>
                    </div>
                  </div>
                </section>
              </>
            )}

            {activeTab === 'ai' && (
              <div style={{ 
                padding: '32px', 
                background: 'rgba(var(--bg-panel-rgb), 0.3)', 
                borderRadius: 24, 
                border: '1px solid var(--border-primary)',
                boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.02)'
              }}>
                <header style={{ marginBottom: 40 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 8px 0', letterSpacing: '-0.7px', color: 'var(--text-primary)' }}>AI Intelligence</h2>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500, margin: 0 }}>Power your workflow with Gemini AI template generation.</p>
                </header>
                <AISettingsSection />
              </div>
            )}

            {activeTab === 'about' && (
              <>
                <header style={{ marginBottom: 48 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>About Debugger</h2>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500, margin: 0 }}>Information about the enterprise suite and resources.</p>
                </header>

                <section style={{ 
                  padding: '40px', 
                  background: 'linear-gradient(135deg, var(--bg-hover), var(--bg-panel))', 
                  border: '1px solid var(--border-primary)', 
                  borderRadius: 'var(--radius-xl)', 
                  position: 'relative', 
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ position: 'absolute', top: -30, right: -30, opacity: 0.05, transform: 'rotate(15deg)' }}>
                      <Sparkles size={240} />
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28 }}>
                      <div style={{ 
                        width: 64, 
                        height: 64, 
                        background: 'linear-gradient(135deg, var(--accent), #22d3ee)', 
                        borderRadius: 16, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'white', 
                        boxShadow: '0 8px 24px -4px var(--accent-glow)'
                      }}>
                        <Layout size={28} strokeWidth={3} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 20, fontWeight: 950, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Liquid Template Debugger</h3>
                        <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 800, margin: '2px 0 0 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Enterprise • v1.2.5</p>
                      </div>
                  </div>

                  <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 32, maxWidth: 500, fontWeight: 500 }}>
                    The high-performance line-by-line debugger for Liquid templates. Engineered for extreme precision and developer velocity.
                  </p>

                  <div style={{ display: 'flex', gap: 12 }}>
                      <motion.a
                        href="https://github.com/soubhik7/LiquidTemplateDebugger"
                        target="_blank"
                        whileHover={{ y: -2, background: 'var(--bg-active)', borderColor: 'var(--accent-soft)' }}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 10, 
                          padding: '10px 18px',
                          borderRadius: 12,
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-primary)',
                          fontSize: 13, 
                          color: 'var(--text-primary)', 
                          textDecoration: 'none', 
                          fontWeight: 800,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Github size={16} /> Repository
                      </motion.a>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 10, 
                        padding: '10px 18px',
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid transparent',
                        fontSize: 13, 
                        color: 'var(--text-muted)', 
                        fontWeight: 700 
                      }}>
                        <Info size={16} /> Production Ready
                      </div>
                  </div>
                </section>
                
                <div style={{ marginTop: 32, padding: '0 8px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 16 }}>RESOURCES</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { label: 'Documentation', icon: ExternalLink, href: '#' },
                      { label: 'Sample Templates', icon: Sparkles, href: '#' },
                      { label: 'Community Support', icon: Github, href: '#' },
                    ].map((item, i) => (
                      <a key={i} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                        <item.icon size={14} style={{ color: 'var(--accent)' }} />
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
