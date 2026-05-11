import { motion, AnimatePresence } from 'framer-motion';
import { Bug, Settings, ChevronRight, BookOpen } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggle = useAppStore((s) => s.toggleSidebar);
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const items: { icon: any; label: string; id: 'debugger' | 'settings' | 'guide' }[] = [
    { icon: Bug, label: 'Debugger', id: 'debugger' },
    { icon: BookOpen, label: 'Liquid Guide', id: 'guide' },
    { icon: Settings, label: 'Settings', id: 'settings' },
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 48 : 200 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      style={{
        flexShrink: 0,
        height: '100%',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-primary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, paddingTop: 8 }}>
        {items.map(({ icon: Icon, label, id }) => {
          const active = activeView === id;
          return (
            <div
              key={id}
              onClick={() => setActiveView(id)}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 14px',
                cursor: 'pointer',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                background: active ? 'var(--accent-soft)' : 'transparent',
                borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
            <Icon size={18} style={{ flexShrink: 0 }} />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden' }}
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
            </div>
          );
        })}
      </div>

      <button
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-end',
          padding: '10px 14px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-primary)',
          transition: 'color var(--transition-fast)',
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.2 }}>
          <ChevronRight size={16} />
        </motion.div>
      </button>
    </motion.aside>
  );
}
