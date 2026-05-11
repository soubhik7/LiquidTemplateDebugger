import type { ReactNode } from 'react';

type Color = 'accent' | 'green' | 'yellow' | 'red' | 'cyan' | 'purple' | 'orange';

interface GradientBadgeProps {
  children: ReactNode;
  color?: Color;
  size?: 'xs' | 'sm';
}

const colorMap: Record<Color, { bg: string; text: string }> = {
  accent: { bg: 'var(--accent-soft)', text: 'var(--accent)' },
  green: { bg: 'rgba(16,185,129,0.12)', text: 'var(--green)' },
  yellow: { bg: 'rgba(245,158,11,0.12)', text: 'var(--yellow)' },
  red: { bg: 'rgba(239,68,68,0.12)', text: 'var(--red)' },
  cyan: { bg: 'rgba(34,211,238,0.12)', text: 'var(--cyan)' },
  purple: { bg: 'rgba(167,139,250,0.12)', text: 'var(--purple)' },
  orange: { bg: 'rgba(251,146,60,0.12)', text: 'var(--orange)' },
};

export function GradientBadge({ children, color = 'accent', size = 'sm' }: GradientBadgeProps) {
  const { bg, text } = colorMap[color];
  const pad = size === 'xs' ? '1px 6px' : '2px 8px';
  const fontSize = size === 'xs' ? '10px' : '11px';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: pad,
        borderRadius: '20px',
        fontSize,
        fontWeight: 600,
        background: bg,
        color: text,
        letterSpacing: '0.3px',
      }}
    >
      {children}
    </span>
  );
}
