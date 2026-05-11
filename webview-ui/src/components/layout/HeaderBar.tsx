import { motion } from 'framer-motion';
import {
  FolderOpen, Play, Circle, CornerDownRight, ArrowDown,
  ArrowUp, RotateCcw, Moon, Sun, Flame, Wind, Waves, Snowflake,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { StatusIndicator } from '../shared/StatusIndicator';
import { AnimatedButton } from '../shared/AnimatedButton';
import type { Theme } from '../../types/app';

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  dark: <Moon size={14} />,
  light: <Sun size={14} />,
  'dark-warm': <Flame size={14} />,
  'light-warm': <Flame size={14} />,
  'dark-cool': <Waves size={14} />,
  'light-cool': <Wind size={14} />,
};

const THEME_CYCLE: Theme[] = ['dark', 'light', 'dark-warm', 'light-warm', 'dark-cool', 'light-cool'];

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

  const cycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(theme);
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
  };

  const debugActions = [
    { id: 'continue', key: 'F5', label: 'Continue', icon: <Play size={13} />, action: () => onStep('continue') },
    { id: 'bp', key: 'F9', label: 'Breakpoint', icon: <Circle size={13} />, action: onToggleBPAtCurrentLine },
    { id: 'over', key: 'F10', label: 'Over', icon: <CornerDownRight size={13} />, action: () => onStep('over') },
    { id: 'into', key: 'F11', label: 'Into', icon: <ArrowDown size={13} />, action: () => onStep('into') },
    { id: 'out', key: '⇧F11', label: 'Out', icon: <ArrowUp size={13} />, action: () => onStep('out') },
  ];

  return (
    <header
      style={{
        height: 52,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 12px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-primary)',
        zIndex: 20,
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginRight: 6 }}>
        <span style={{ fontSize: 16 }}>🔍</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '-0.3px' }}>
          Liquid
        </span>
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--border-primary)', margin: '0 4px' }} />

      {/* Load */}
      <AnimatedButton
        variant="primary"
        size="sm"
        icon={<FolderOpen size={13} />}
        onClick={onLoad}
      >
        Load
      </AnimatedButton>

      <div style={{ width: 1, height: 20, background: 'var(--border-primary)', margin: '0 4px' }} />

      {/* Debug actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: '2px 6px',
          background: 'var(--glass-bg)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {debugActions.map(({ id, key, label, icon, action }) => (
          <motion.button
            key={id}
            whileHover={disabled ? {} : { background: 'var(--bg-hover)' }}
            whileTap={disabled ? {} : { scale: 0.94 }}
            onClick={action}
            disabled={disabled}
            title={`${label} (${key})`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
              fontSize: 11,
              fontWeight: 500,
              opacity: disabled ? 0.35 : 1,
              transition: 'all var(--transition-fast)',
            }}
          >
            <kbd
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-secondary)',
                borderRadius: 3,
                padding: '0 4px',
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: 'var(--accent)',
                minWidth: 22,
                textAlign: 'center',
              }}
            >
              {key}
            </kbd>
            <span>{label}</span>
          </motion.button>
        ))}
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--border-primary)', margin: '0 4px' }} />

      {/* Reset */}
      <AnimatedButton
        variant="ghost"
        size="sm"
        icon={<RotateCcw size={12} />}
        onClick={onReset}
        disabled={!loaded || isLoading}
      >
        Reset
      </AnimatedButton>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Theme toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.92 }}
        onClick={cycleTheme}
        title={`Theme: ${theme}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 10px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--glass-bg)',
          border: '1px solid var(--border-primary)',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontSize: 11,
          fontWeight: 500,
        }}
      >
        {THEME_ICONS[theme]}
        <span style={{ textTransform: 'capitalize' }}>{theme}</span>
      </motion.button>

      <div style={{ width: 1, height: 20, background: 'var(--border-primary)', margin: '0 4px' }} />

      {/* Status */}
      <StatusIndicator debugState={debugState} />
    </header>
  );
}
