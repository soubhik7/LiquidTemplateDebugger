import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { Palette, Sun, Moon, Info, Github } from 'lucide-react';
import { ACCENT_COLORS } from '../../utils/constants';

export function SettingsPanel() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const accentColor = useAppStore((s) => s.accentColor);
  const setAccentColor = useAppStore((s) => s.setAccentColor);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        flex: 1,
        padding: '32px 48px',
        background: 'var(--bg-primary)',
        overflowY: 'auto',
        color: 'var(--text-primary)',
      }}
    >
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.5px' }}>
          Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
          Customize your Liquid Debugger experience and appearance.
        </p>

        {/* Theme Selection */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Palette size={20} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Appearance</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {/* Theme Toggle */}
            <div
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{
                padding: 16,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-primary)')}
            >
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Theme</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Currently {theme}</div>
              </div>
            </div>
          </div>

          {/* Accent Color */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Accent Color</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {ACCENT_COLORS.map((c) => (
                <div
                  key={c.value}
                  onClick={() => setAccentColor(c.value as any)}
                  title={c.label}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: c.hex,
                    cursor: 'pointer',
                    border: accentColor === c.value ? '2px solid var(--text-primary)' : '2px solid transparent',
                    boxShadow: accentColor === c.value ? `0 0 10px ${c.hex}` : 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                />
              ))}
            </div>
          </div>
        </section>

        {/* About */}
        <section style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Info size={20} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>About</h2>
          </div>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius)', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, background: 'var(--accent)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 20 }}>
                L
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Dot Liquid Template Debugger</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Version 1.1.8</div>
              </div>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 20 }}>
              A professional-grade debugging environment for Liquid templates. Built for developers who need to understand complex transformations with line-by-line precision.
            </p>
            <div style={{ display: 'flex', gap: 16 }}>
              <a
                href="https://github.com/soubhik7/LiquidTemplateDebugger"
                target="_blank"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
              >
                <Github size={16} /> View on GitHub
              </a>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
