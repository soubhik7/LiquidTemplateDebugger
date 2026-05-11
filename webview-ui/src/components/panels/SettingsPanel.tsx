import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { Palette, Sun, Moon, Info, Github, Sparkles, Check, Monitor } from 'lucide-react';
import { ACCENT_COLORS } from '../../utils/constants';
import type { Theme } from '../../types/app';

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

export function SettingsPanel() {
  const currentTheme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const accentColor = useAppStore((s) => s.accentColor);
  const setAccentColor = useAppStore((s) => s.setAccentColor);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        flex: 1,
        padding: '48px 24px',
        background: 'var(--bg-primary)',
        overflowY: 'auto',
        color: 'var(--text-primary)',
        height: '100%'
      }}
    >
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        <header style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 12, letterSpacing: '-1px', background: 'linear-gradient(135deg, var(--accent), #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Experience & Theme
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 500 }}>
            Personalize your workspace with curated themes and accent colors.
          </p>
        </header>

        {/* Theme Grid */}
        <section style={{ marginBottom: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ padding: 8, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Palette size={20} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Choose a Theme</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {THEMES.map((t) => (
              <motion.div
                key={t.id}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setTheme(t.id)}
                style={{
                  padding: 12,
                  background: 'var(--bg-surface)',
                  border: `2px solid ${currentTheme === t.id ? 'var(--accent)' : 'var(--border-primary)'}`,
                  borderRadius: 'var(--radius-xl)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: currentTheme === t.id ? '0 10px 25px -5px rgba(var(--accent-rgb), 0.2)' : 'var(--shadow-sm)'
                }}
              >
                {/* Preview Box */}
                <div style={{ 
                  height: 60, 
                  borderRadius: 'var(--radius-md)', 
                  background: t.colors[0], 
                  marginBottom: 12, 
                  overflow: 'hidden',
                  display: 'flex',
                  border: '1px solid var(--border-secondary)'
                }}>
                  <div style={{ width: '30%', height: '100%', background: t.colors[1] }} />
                  <div style={{ flex: 1, padding: 8, display: 'flex', gap: 4 }}>
                     <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)', opacity: 0.8 }} />
                     <div style={{ width: 16, height: 4, borderRadius: 1, background: 'rgba(255,255,255,0.1)', marginTop: 2 }} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <t.icon size={14} style={{ color: currentTheme === t.id ? 'var(--accent)' : 'var(--text-muted)' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: currentTheme === t.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {t.label}
                    </span>
                  </div>
                  {currentTheme === t.id && <Check size={14} style={{ color: 'var(--accent)' }} />}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Accent Color Selection */}
        <section style={{ marginBottom: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ padding: 8, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Sparkles size={20} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Accent Color</h2>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {ACCENT_COLORS.map((c) => (
              <motion.div
                key={c.value}
                whileHover={{ scale: 1.15, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setAccentColor(c.value as any)}
                title={c.label}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  background: c.hex,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `3px solid ${accentColor === c.value ? 'var(--text-primary)' : 'transparent'}`,
                  boxShadow: accentColor === c.value ? `0 0 20px -2px ${c.hex}` : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                {accentColor === c.value && <Check size={18} style={{ color: 'white', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Info & Footer */}
        <section style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 48 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-xl)', padding: 32, position: 'relative', overflow: 'hidden' }}>
             <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.03 }}>
                <Palette size={200} />
             </div>
             
             <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                <div style={{ 
                  width: 64, 
                  height: 64, 
                  background: 'linear-gradient(135deg, var(--accent), #06b6d4)', 
                  borderRadius: 18, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: 'white', 
                  fontWeight: 900, 
                  fontSize: 28,
                  boxShadow: '0 8px 16px -4px var(--accent-glow)'
                }}>
                  L
                </div>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Dot Liquid Debugger</h3>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>Professional Suite • v1.1.8</p>
                </div>
             </div>

             <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 600 }}>
               The most powerful line-by-line debugger for DotLiquid templates. Custom-built to handle enterprise transformations with ease.
             </p>

             <div style={{ display: 'flex', gap: 24 }}>
                <a
                  href="https://github.com/soubhik7/LiquidTemplateDebugger"
                  target="_blank"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}
                >
                  <Github size={18} /> Repository
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>
                  <Info size={18} /> Documentation in Liquid Guide
                </div>
             </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
