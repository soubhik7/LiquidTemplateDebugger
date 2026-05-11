import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  visible: boolean;
  x: number;
  y: number;
  content: React.ReactNode;
  loading?: boolean;
}

export function Tooltip({ visible, x, y, content, loading }: TooltipProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 5 }}
          style={{
            position: 'fixed',
            left: x,
            top: y,
            zIndex: 1000,
            pointerEvents: 'none',
            maxWidth: 400,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            boxShadow: 'var(--shadow-lg)',
            color: 'var(--text-primary)',
            backdropFilter: 'blur(var(--glass-blur, 10px))',
            WebkitBackdropFilter: 'blur(var(--glass-blur, 10px))',
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ width: 12, height: 12, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%' }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Evaluating...</span>
            </div>
          ) : content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
