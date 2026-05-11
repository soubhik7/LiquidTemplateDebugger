import { motion } from 'framer-motion';
import type { WebUIState } from '../../types/app';

interface StatusIndicatorProps {
  debugState: WebUIState | null;
}

export function StatusIndicator({ debugState }: StatusIndicatorProps) {
  const loaded = debugState?.isLoaded;
  const complete = loaded && debugState?.state?.isComplete;
  const currentLine = debugState?.state?.currentLine;

  let label: string;
  let color: string;
  let pulse: boolean;

  if (!loaded) {
    label = 'No session';
    color = 'var(--text-muted)';
    pulse = false;
  } else if (complete) {
    label = 'Complete';
    color = 'var(--cyan)';
    pulse = false;
  } else {
    label = currentLine ? `Line ${currentLine}` : 'Ready';
    color = 'var(--green)';
    pulse = true;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '20px',
        background: `${color}18`,
        border: `1px solid ${color}30`,
      }}
    >
      <motion.div
        animate={pulse ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
        transition={pulse ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : {}}
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: '11px', fontWeight: 600, color, whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  );
}
