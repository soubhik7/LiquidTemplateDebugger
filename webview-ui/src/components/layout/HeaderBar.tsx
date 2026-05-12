import { motion } from 'framer-motion';
import {
  FolderOpen, Play, Circle, CornerDownRight, ArrowDown,
  ArrowUp, RotateCcw, Moon, Sun, Flame, Wind, Waves, Snowflake, Search,
  Terminal, Shield, Zap, Sparkles, Settings, BookOpen, Bug
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
  const debugState = useAppStore((s) => s.debugState);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const isLoading = useAppStore((s) => s.isLoading);

  const loaded = !!debugState?.isLoaded;
  const complete = loaded && !!debugState?.state?.isComplete;
  const disabled = !loaded || complete || isLoading;

  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const cycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(theme);
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
  };

  const debugActions = [
    { id: 'continue', key: 'F5', label: 'Continue', icon: <Play size={14} strokeWidth={STROKE_WIDTH} />, color: 'var(--green)', action: () => onStep('continue') },
    { id: 'bp', key: 'F9', label: 'Breakpoint', icon: <Circle size={14} strokeWidth={STROKE_WIDTH} />, color: 'var(--rose)', action: onToggleBPAtCurrentLine },
    { id: 'over', key: 'F10', label: 'Step Over', icon: <CornerDownRight size={14} strokeWidth={STROKE_WIDTH} />, color: 'var(--blue)', action: () => onStep('over') },
    { id: 'into', key: 'F11', label: 'Step Into', icon: <ArrowDown size={14} strokeWidth={STROKE_WIDTH} />, color: 'var(--accent)', action: () => onStep('into') },
    { id: 'out', key: '⇧F11', label: 'Step Out', icon: <ArrowUp size={14} strokeWidth={STROKE_WIDTH} />, color: 'var(--purple)', action: () => onStep('out') },
  ];

  return (
    <header
      style={{
        height: 60,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 24px',
        background: 'rgba(var(--bg-surface-rgb), 0.75)',
        backdropFilter: 'blur(16px) saturate(180%)',
        borderBottom: '1px solid var(--border-primary)',
        zIndex: 100,
        position: 'relative',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Brand & Load */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ 
          padding: 6, 
          borderRadius: 8, 
          background: 'linear-gradient(135deg, var(--accent), var(--purple))', 
          color: 'white',
          boxShadow: '0 4px 8px var(--accent-soft)'
        }}>
          <Zap size={18} strokeWidth={2.5} fill="white" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.2px', lineHeight: 1 }}>
            Liquid Debugger
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 3 }}>
            v1.2.0 Enterprise
          </span>
        </div>
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border-primary)', margin: '0 8px' }} />

      <AnimatedButton
        variant="ghost"
        size="sm"
        icon={<FolderOpen size={14} strokeWidth={STROKE_WIDTH} />}
        onClick={onLoad}
        style={{ fontWeight: 800, padding: '8px 16px', background: 'var(--bg-panel)', borderRadius: 10 }}
      >
        Load Template
      </AnimatedButton>

      {/* Control Cluster */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '3px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
          margin: '0 8px'
        }}
      >
        {debugActions.map(({ id, key, label, icon, color, action }) => (
          <motion.button
            key={id}
            whileHover={disabled ? {} : { background: 'var(--bg-hover)', y: -1 }}
            whileTap={disabled ? {} : { scale: 0.94 }}
            onClick={action}
            disabled={disabled}
            title={`${label} (${key})`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 800,
              opacity: disabled ? 0.3 : 1,
              transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            <div style={{ color: disabled ? 'var(--text-muted)' : color, display: 'flex' }}>
              {icon}
            </div>
            <span style={{ fontSize: 11, letterSpacing: '-0.1px' }}>{label}</span>
          </motion.button>
        ))}
      </div>

      <AnimatedButton
        variant="ghost"
        size="sm"
        icon={<RotateCcw size={14} strokeWidth={STROKE_WIDTH} />}
        onClick={onReset}
        disabled={!loaded || isLoading}
        style={{ fontWeight: 800, color: 'var(--text-muted)' }}
      >
        Reset
      </AnimatedButton>

      <div style={{ width: 1, height: 24, background: 'var(--border-primary)', margin: '0 8px' }} />

      {/* View Switcher */}
      <div style={{
        display: 'flex',
        background: 'rgba(var(--bg-panel-rgb), 0.5)',
        padding: 4,
        borderRadius: 12,
        border: '1px solid var(--border-primary)',
        gap: 4,
        position: 'relative'
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
                gap: 8,
                padding: '8px 16px',
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
              <span style={{ position: 'relative', zIndex: 11 }}>{v.label}</span>
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
            gap: 10,
            padding: '6px 14px',
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
          {THEME_ICONS[theme]}
          <span>{theme}</span>
        </motion.button>

        <div style={{ width: 1, height: 24, background: 'var(--border-primary)' }} />

        {/* Enhanced Status Indicator */}
        <div style={{
          padding: '6px 16px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-primary)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <StatusIndicator debugState={debugState} />
        </div>
      </div>
    </header>
  );
}
