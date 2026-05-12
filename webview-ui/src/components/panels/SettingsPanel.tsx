import { motion } from 'framer-motion';
import { useAppStore, getAccentHex } from '../../store/useAppStore';
import { Palette, Sun, Moon, Info, Github, Sparkles, Check, Monitor, Layout, ExternalLink, Pipette } from 'lucide-react';
import { ACCENT_COLORS } from '../../utils/constants';
import type { Theme } from '../../types/app';
import { useRef } from 'react';
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
      height: 80, 
      borderRadius: 'var(--radius-lg)', 
      background: colors[0], 
      marginBottom: 14, 
      overflow: 'hidden',
      position: 'relative',
      border: '1px solid var(--border-primary)',
      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)'
    }}>
      {/* Mini Sidebar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '25%', background: colors[1], borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 4, width: i === 1 ? '70%' : '50%', background: 'var(--accent)', opacity: 0.3, borderRadius: 2 }} />
          ))}
        </div>
      </div>
      {/* Mini Header */}
      <div style={{ position: 'absolute', left: '25%', right: 0, top: 0, height: '20%', background: colors[1], borderBottom: '1px solid rgba(255,255,255,0.05)' }} />
      {/* Mini Editor Content */}
      <div style={{ position: 'absolute', left: '30%', top: '30%', right: 8, bottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 4, width: '90%', background: 'var(--accent)', opacity: 0.15, borderRadius: 2 }} />
        <div style={{ height: 4, width: '60%', background: 'var(--accent)', opacity: 0.1, borderRadius: 2 }} />
        <div style={{ height: 4, width: '80%', background: 'var(--accent)', opacity: 0.15, borderRadius: 2 }} />
      </div>

      {active && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{ 
            position: 'absolute', 
            top: 6, 
            right: 6, 
            background: 'var(--accent)', 
            color: 'white', 
            borderRadius: '50%', 
            padding: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          <Check size={12} strokeWidth={4} />
        </motion.div>
      )}
    </div>
  );
}

export function SettingsPanel() {
  const currentTheme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const accentColor = useAppStore((s) => s.accentColor);
  const setAccentColor = useAppStore((s) => s.setAccentColor);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const isCustomColor = accentColor.startsWith('#') && !ACCENT_COLORS.some(c => c.hex.toLowerCase() === accentColor.toLowerCase());
  const currentHex = getAccentHex(accentColor);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        flex: 1,
        padding: '64px 24px',
        background: 'var(--bg-primary)',
        overflowY: 'auto',
        color: 'var(--text-primary)',
        height: '100%'
      }}
    >
      <div style={{ 
        maxWidth: 800, 
        margin: '0 auto', 
        background: 'var(--bg-surface)', 
        borderRadius: 'var(--radius-2xl)', 
        border: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-xl)',
        padding: '48px 56px',
        position: 'relative'
      }}>
        <header style={{ marginBottom: 56, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
             <div style={{ padding: 10, borderRadius: 12, background: 'linear-gradient(135deg, var(--accent), var(--purple))', color: 'white' }}>
                <Layout size={28} strokeWidth={2.5} />
             </div>
             <div>
                <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>
                  Workspace Settings
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>
                  Customize the visual identity of your debugger
                </p>
             </div>
          </div>
        </header>

        {/* Theme Grid */}
        <section style={{ marginBottom: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ color: 'var(--accent)' }}>
              <Palette size={20} strokeWidth={2.5} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>
              Visual Themes
            </h2>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', 
            gap: 20 
          }}>
            {THEMES.map((t) => (
              <motion.div
                key={t.id}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setTheme(t.id)}
                style={{
                  padding: '16px',
                  background: currentTheme === t.id ? 'var(--bg-active)' : 'var(--bg-hover)',
                  border: '1px solid',
                  borderColor: currentTheme === t.id ? 'var(--accent)' : 'var(--border-primary)',
                  borderRadius: 'var(--radius-xl)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  boxShadow: currentTheme === t.id ? 'var(--shadow-lg)' : 'var(--shadow-sm)'
                }}
              >
                <ThemePreview colors={t.colors} active={currentTheme === t.id} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ 
                    padding: 6, 
                    borderRadius: 8, 
                    background: currentTheme === t.id ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    color: currentTheme === t.id ? 'white' : 'var(--text-muted)',
                    transition: 'all 0.3s'
                  }}>
                    <t.icon size={14} strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: currentTheme === t.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {t.label}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Accent Color Selection */}
        <section style={{ marginBottom: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ color: 'var(--accent)' }}>
              <Sparkles size={20} strokeWidth={2.5} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>
              Accent Highlights
            </h2>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            {ACCENT_COLORS.map((c) => {
               const isSelected = accentColor === c.value;
               const isVeryLight = c.hex.toLowerCase() === '#fef08a' || c.hex.toLowerCase() === '#ffffff';
               
               return (
                  <motion.div
                    key={c.value}
                    whileHover={{ scale: 1.2, rotate: 8 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setAccentColor(c.value as any)}
                    title={c.label}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: c.hex,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isSelected ? '3px solid var(--text-primary)' : '3px solid transparent',
                      boxShadow: isSelected ? `0 0 24px -4px ${c.hex}` : '0 4px 12px rgba(0,0,0,0.1)',
                      transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                  >
                    {isSelected && (
                      <Check size={20} strokeWidth={4} style={{ color: isVeryLight ? '#000' : '#fff' }} />
                    )}
                  </motion.div>
               );
            })}

            {/* Custom Color Picker */}
            <div style={{ width: 2, height: 24, background: 'var(--border-primary)', margin: '0 8px' }} />
            
            <div style={{ position: 'relative' }}>
              <input 
                type="color"
                ref={colorInputRef}
                value={currentHex}
                onChange={(e) => setAccentColor(e.target.value)}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              />
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => colorInputRef.current?.click()}
                style={{
                  padding: '10px 16px',
                  background: isCustomColor ? accentColor : 'var(--bg-hover)',
                  border: '1px solid',
                  borderColor: isCustomColor ? 'var(--text-primary)' : 'var(--border-primary)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: isCustomColor ? '#fff' : 'var(--text-primary)',
                  boxShadow: isCustomColor ? `0 8px 20px -4px ${accentColor}` : 'var(--shadow-sm)',
                  transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
              >
                <Pipette size={18} strokeWidth={2.5} />
                <span style={{ fontSize: 13, fontWeight: 800 }}>
                  {isCustomColor ? accentColor.toUpperCase() : 'Custom Color'}
                </span>
              </motion.div>
            </div>
          </div>
        </section>
  
        {/* AI Template Generation Settings */}
        <AISettingsSection />
  
        {/* Info & Footer */}
        <section style={{ 
          marginTop: 72, 
          padding: '40px', 
          background: 'linear-gradient(135deg, var(--bg-hover), var(--bg-surface))', 
          border: '1px solid var(--border-primary)', 
          borderRadius: 'var(--radius-xl)', 
          position: 'relative', 
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)'
        }}>
           <div style={{ position: 'absolute', top: -30, right: -30, opacity: 0.02 }}>
              <Palette size={240} />
           </div>
           
           <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28 }}>
              <div style={{ 
                width: 72, 
                height: 72, 
                background: 'linear-gradient(135deg, var(--accent), #22d3ee)', 
                borderRadius: 20, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'white', 
                boxShadow: '0 12px 24px -8px var(--accent-glow)'
              }}>
                <Layout size={32} strokeWidth={3} />
              </div>
              <div>
                <h3 style={{ fontSize: 22, fontWeight: 950, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Dot Liquid Debugger</h3>
                <p style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 800, margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Enterprise Suite • v1.2.0</p>
              </div>
           </div>

           <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 32, maxWidth: 640, fontWeight: 500 }}>
             The industry-standard line-by-line debugger for DotLiquid templates. Engineered for high-fidelity visualization and real-time template diagnostics.
           </p>

           <div style={{ display: 'flex', gap: 16 }}>
              <motion.a
                href="https://github.com/soubhik7/LiquidTemplateDebugger"
                target="_blank"
                whileHover={{ y: -2, background: 'var(--bg-active)' }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 10, 
                  padding: '12px 20px',
                  borderRadius: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-primary)',
                  fontSize: 14, 
                  color: 'var(--text-primary)', 
                  textDecoration: 'none', 
                  fontWeight: 800,
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <Github size={18} /> Repository
              </motion.a>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 10, 
                padding: '12px 20px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid transparent',
                fontSize: 14, 
                color: 'var(--text-muted)', 
                fontWeight: 700 
              }}>
                <Info size={18} /> v1.2.0 Stable
              </div>
           </div>
        </section>
      </div>
    </motion.div>
  );
}
