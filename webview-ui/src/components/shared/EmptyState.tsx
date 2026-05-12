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
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 12,
        padding: 32,
        textAlign: 'center',
        color: 'var(--text-muted)',
      }}
    >
      <div style={{ 
        fontSize: 40, 
        opacity: 0.3, 
        color: 'var(--accent)',
        filter: 'drop-shadow(0 4px 8px var(--accent-soft))'
      }}>{icon}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ 
          fontSize: 14, 
          fontWeight: 800, 
          color: 'var(--text-primary)', 
          lineHeight: 1.4,
          letterSpacing: '-0.2px'
        }}>
          {message}
        </p>
        {sub && (
          <p style={{ 
            fontSize: 12, 
            fontWeight: 500,
            opacity: 0.6, 
            lineHeight: 1.4 
          }}>
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}
