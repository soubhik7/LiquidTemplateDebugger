import { motion } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';
import { fadeIn } from '../../utils/animation';

interface GlassCardProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  noPad?: boolean;
  noAnimation?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className = '', style, noPad, noAnimation, onClick }: GlassCardProps) {
  const base = ['rounded-xl', 'overflow-hidden', !noPad && 'p-4', className]
    .filter(Boolean)
    .join(' ');

  const baseStyle: CSSProperties = {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    ...style,
  };

  if (noAnimation) {
    return (
      <div className={base} style={baseStyle} onClick={onClick}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className={base}
      style={baseStyle}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
