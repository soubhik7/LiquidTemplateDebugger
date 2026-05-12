import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen, Play, Circle, CornerDownRight, ArrowDown,
  ArrowUp, RotateCcw, Moon, Sun, Flame, Wind, Waves, Zap, Sparkles, Settings, BookOpen, Bug
} from 'lucide-react';
const STROKE_WIDTH = 1.5;
import { useAppStore } from '../../store/useAppStore';
import { StatusIndicator } from '../shared/StatusIndicator';
import { AnimatedButton } from '../shared/AnimatedButton';
import type { Theme } from '../../types/app';

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  dark: <Moon size={14} strokeWidth={STROKE_WIDTH} />,
  light: <Sun size={14} strokeWidth={STROKE_WIDTH} />,
  'dark-warm': <Flame size={14} strokeWidth={STROKE_WIDTH} />,
  'light-warm': <Flame size={14} strokeWidth={STROKE_WIDTH} />,
  'dark-cool': <Waves size={14} strokeWidth={STROKE_WIDTH} />,
  'light-cool': <Wind size={14} strokeWidth={STROKE_WIDTH} />,
  'midnight': <Moon size={14} strokeWidth={STROKE_WIDTH} />,
  'glass-dark': <Moon size={14} strokeWidth={STROKE_WIDTH} />,
  'glass-light': <Sun size={14} strokeWidth={STROKE_WIDTH} />,
};

const THEME_CYCLE: Theme[] = ['dark', 'light', 'dark-warm', 'light-warm', 'dark-cool', 'light-cool', 'midnight', 'glass-dark', 'glass-light'];

interface HeaderBarProps {
  onLoad: () => void;
  onStep: (action: string) => void;
  onReset: () => void;
  onToggleBPAtCurrentLine: () => void;
}

export function HeaderBar({ onLoad, onStep, onReset, onToggleBPAtCurrentLine }: HeaderBarProps) {
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null);
  const debugState = useAppStore((s) => s.debugState);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const isLoading = useAppStore((s) => s.isLoading);

  // Robust theme detection
  const isDark = theme.includes('dark') || theme === 'midnight';
  
  // High contrast colors for all themes
  const btnBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const btnBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
  const textColor = isDark ? '#ffffff' : 'var(--text-primary)';
  const clusterBg = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)';
  const clusterBorder = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';

  const loaded = !!debugState?.isLoaded;
  const complete = loaded && !!debugState?.state?.isComplete;
  const disabled = !loaded || complete || isLoading;

  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const cycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(theme);
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
  };

  const debugActions = useMemo(() => [
    { id: 'continue', key: 'F5', label: 'Continue', icon: <Play size={14} strokeWidth={STROKE_WIDTH} />, color: '#10b981', action: () => onStep('continue') },
    { id: 'bp', key: 'F9', label: 'Breakpoint', icon: <Circle size={14} strokeWidth={STROKE_WIDTH} />, color: '#f43f5e', action: onToggleBPAtCurrentLine },
    { id: 'over', key: 'F10', label: 'Step Over', icon: <CornerDownRight size={14} strokeWidth={STROKE_WIDTH} />, color: '#3b82f6', action: () => onStep('over') },
    { id: 'into', key: 'F11', label: 'Step Into', icon: <ArrowDown size={14} strokeWidth={STROKE_WIDTH} />, color: '#6366f1', action: () => onStep('into') },
    { id: 'out', key: '⇧F11', label: 'Step Out', icon: <ArrowUp size={14} strokeWidth={STROKE_WIDTH} />, color: '#a855f7', action: () => onStep('out') },
  ], [onStep, onToggleBPAtCurrentLine]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const shortcut = debugActions.find(a => 
        a.key === e.key || 
        (a.key === '⇧F11' && e.key === 'F11' && e.shiftKey)
      );
      
      if (shortcut && !disabled) {
        setActiveShortcut(shortcut.id);
        setTimeout(() => setActiveShortcut(null), 300);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [debugActions, disabled]);

  return (
    <header
      style={{
        height: 64,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 24px',
        background: 'rgba(var(--bg-surface-rgb), 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid var(--border-primary)',
        zIndex: 100,
        position: 'relative',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Brand & Load */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ 
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8, 
          background: 'linear-gradient(135deg, var(--accent), var(--purple))', 
          color: 'white',
          boxShadow: '0 4px 8px var(--accent-soft)'
        }}>
          <Zap size={18} strokeWidth={2.5} fill="white" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
            Liquid Debugger
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1 }}>
            v1.2.0 Enterprise
          </span>
        </div>
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border-primary)', margin: '0 4px' }} />

      <AnimatedButton
        variant="ghost"
        size="sm"
        icon={<FolderOpen size={14} strokeWidth={STROKE_WIDTH} />}
        onClick={onLoad}
        style={{ 
          height: 36,
          fontWeight: 900, 
          padding: '0 20px', 
          background: btnBg, 
          border: `1px solid ${btnBorder}`,
          borderRadius: 12,
          boxShadow: 'var(--shadow-sm)',
          textTransform: 'uppercase',
          fontSize: 10,
          letterSpacing: '1px',
          color: textColor,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        Load Template
      </AnimatedButton>

      {/* Control Cluster */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: clusterBg,
          border: `1px solid ${clusterBorder}`,
          borderRadius: '16px',
          boxShadow: isDark ? 'inset 0 1px 2px rgba(0,0,0,0.2)' : 'var(--shadow-sm)',
          margin: '0 4px',
          padding: '4px',
          backdropFilter: 'blur(12px)',
          height: 48
        }}
      >
        {debugActions.map(({ id, key, label, icon, color, action }) => (
          <motion.button
            key={id}
            layout
            initial={false}
            animate={activeShortcut === id ? { 
              scale: 0.9, 
              background: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
              boxShadow: '0 0 15px var(--accent-glow)'
            } : { 
              scale: 1, 
              background: 'transparent',
              boxShadow: 'none'
            }}
            whileHover={disabled ? {} : { 
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)', 
              y: -1
            }}
            whileTap={disabled ? {} : { scale: 0.92 }}
            onClick={(e) => {
              if (disabled) return;
              setActiveShortcut(id);
              setTimeout(() => setActiveShortcut(null), 200);
              action();
            }}
            disabled={disabled}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              padding: '4px 12px',
              minWidth: 72,
              height: '100%',
              borderRadius: 12,
              border: activeShortcut === id ? '1px solid var(--accent)' : '1px solid transparent',
              cursor: disabled ? 'not-allowed' : 'pointer',
              color: disabled ? (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)') : textColor,
              opacity: disabled ? 0.6 : 1,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative'
            }}
          >
            <div style={{ 
              color: disabled ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)') : color, 
              display: 'flex',
              marginBottom: 1,
              filter: disabled ? 'grayscale(1) brightness(0.6)' : 'none',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {icon}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, justifyContent: 'center' }}>
              <span style={{ 
                fontSize: 9, 
                fontWeight: 900, 
                letterSpacing: '0.4px', 
                textTransform: 'uppercase', 
                color: activeShortcut === id ? 'var(--accent)' : (disabled ? (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)') : textColor),
                lineHeight: 1
              }}>{label}</span>
              <span style={{ 
                fontSize: 7, 
                fontWeight: 800, 
                color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                marginTop: 2,
                fontFamily: 'var(--font-mono)',
                lineHeight: 1
              }}>{key}</span>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatedButton
        variant="ghost"
        size="sm"
        icon={<RotateCcw size={14} strokeWidth={STROKE_WIDTH} />}
        onClick={onReset}
        disabled={!loaded || isLoading}
        style={{ 
          height: 36,
          fontWeight: 900, 
          color: textColor,
          background: btnBg,
          border: `1px solid ${btnBorder}`,
          borderRadius: 12,
          padding: '0 20px',
          boxShadow: 'var(--shadow-sm)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          opacity: disabled ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        Reset
      </AnimatedButton>

      <div style={{ width: 1, height: 24, background: 'var(--border-primary)', margin: '0 4px' }} />

      {/* View Switcher */}
      <div style={{
        display: 'flex',
        background: 'rgba(var(--bg-panel-rgb), 0.5)',
        padding: 4,
        borderRadius: 12,
        border: '1px solid var(--border-primary)',
        gap: 4,
        position: 'relative',
        height: 40,
        alignItems: 'center'
      }}>
        {[
          { id: 'debugger', label: 'Debugger', icon: Bug },
          { id: 'generator', label: 'AI Mapper', icon: Sparkles },
          { id: 'guide', label: 'Guide', icon: BookOpen },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map((v) => {
          const isActive = activeView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '0 16px',
                height: 32,
                borderRadius: 9,
                border: isActive ? '1px solid var(--accent-glow)' : '1px solid transparent',
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 800,
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 0 15px var(--accent-glow)' : 'none',
                position: 'relative',
                zIndex: 10,
                pointerEvents: 'auto'
              }}
            >
              <v.icon size={14} strokeWidth={STROKE_WIDTH} />
              <span style={{ position: 'relative', zIndex: 11, lineHeight: 1 }}>{v.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="header-active-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    background: 'var(--accent)', 
                    borderRadius: 8, 
                    zIndex: -1, 
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)' 
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      {/* Right Side Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Theme */}
        <motion.button
          whileHover={{ scale: 1.05, background: 'var(--bg-hover)' }}
          whileTap={{ scale: 0.95 }}
          onClick={cycleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: '0 14px',
            height: 36,
            borderRadius: 10,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-primary)',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'capitalize',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {THEME_ICONS[theme]}
          </div>
          <span style={{ lineHeight: 1 }}>{theme}</span>
        </motion.button>

        <div style={{ width: 1, height: 24, background: 'var(--border-primary)' }} />

        {/* Enhanced Status Indicator */}
        <div style={{
          height: 36,
          padding: '0 16px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-primary)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <StatusIndicator debugState={debugState} />
        </div>
      </div>
    </header>
  );
}
