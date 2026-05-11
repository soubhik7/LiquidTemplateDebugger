import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  message: string;
  sub?: string;
}

export function EmptyState({ icon, message, sub }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 10,
        padding: 24,
        textAlign: 'center',
        color: 'var(--text-muted)',
      }}
    >
      <div style={{ fontSize: 32, opacity: 0.35 }}>{icon}</div>
      <p style={{ fontSize: 13, lineHeight: 1.5 }}>{message}</p>
      {sub && <p style={{ fontSize: 11, opacity: 0.6 }}>{sub}</p>}
    </motion.div>
  );
}
