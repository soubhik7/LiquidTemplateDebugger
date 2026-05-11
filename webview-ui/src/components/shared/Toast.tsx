import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { Toast as ToastType } from '../../types/ui';
import { toastVariants } from '../../utils/animation';

const ICONS = {
  success: <CheckCircle size={15} />,
  error: <XCircle size={15} />,
  info: <Info size={15} />,
  warning: <AlertTriangle size={15} />,
};

const COLORS = {
  success: 'var(--green)',
  error: 'var(--red)',
  info: 'var(--blue)',
  warning: 'var(--yellow)',
};

function ToastItem({ toast }: { toast: ToastType }) {
  const removeToast = useAppStore((s) => s.removeToast);
  const color = COLORS[toast.type];

  useEffect(() => {
    const t = setTimeout(() => removeToast(toast.id), toast.duration);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, removeToast]);

  return (
    <motion.div
      layout
      variants={toastVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        position: 'relative',
        minWidth: 280,
        maxWidth: 420,
        background: 'var(--bg-panel)',
        border: `1px solid var(--border-secondary)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 'var(--radius-lg)',
        padding: '12px 36px 12px 14px',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
        <span style={{ color }}>{ICONS[toast.type]}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{toast.title}</span>
      </div>
      {toast.message && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
          {toast.message}
        </p>
      )}
      <button
        onClick={() => removeToast(toast.id)}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          display: 'flex',
          padding: 2,
        }}
      >
        <X size={14} />
      </button>
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: toast.duration / 1000, ease: 'linear' }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 2,
          width: '100%',
          background: color,
          transformOrigin: 'left',
        }}
      />
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
