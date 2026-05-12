import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronRight, 
  BarChart3, 
  Eye, 
  Circle, 
  AlertCircle, 
  Plus,
  Play,
  X,
  Target
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { VariablesPanel } from '../panels/VariablesPanel';
import { InspectorPanel } from '../panels/InspectorPanel';

interface AccordionSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  color?: string;
}

function AccordionSection({ id, title, icon, count, isOpen, onToggle, children, color }: AccordionSectionProps) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      borderBottom: '1px solid var(--border-primary)',
      overflow: 'hidden',
      flex: 'none',
      width: '100%'
    }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'var(--bg-panel)',
          border: 'none',
          width: '100%',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.2s ease',
          flexShrink: 0
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-panel)'; }}
      >
        <div style={{ color: isOpen ? 'var(--accent)' : 'var(--text-muted)', display: 'flex' }}>
          {isOpen ? <ChevronDown size={14} strokeWidth={3} /> : <ChevronRight size={14} />}
        </div>
        <div style={{ color: isOpen ? (color || 'var(--accent)') : 'var(--text-secondary)', display: 'flex' }}>
          {icon}
        </div>
        <span style={{ 
          fontSize: 11, 
          fontWeight: 800, 
          color: isOpen ? 'var(--text-primary)' : 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          flex: 1
        }}>
          {title}
        </span>
        {count !== undefined && count > 0 && (
          <span style={{
            fontSize: 10,
            fontWeight: 800,
            padding: '1px 6px',
            borderRadius: 10,
            background: isOpen ? (color ? `rgba(var(--${id}-rgb, 100, 100, 100), 0.15)` : 'var(--accent-soft)') : 'var(--bg-hover)',
            color: isOpen ? (color || 'var(--accent)') : 'var(--text-muted)',
            border: isOpen ? `1px solid ${color || 'var(--accent-glow)'}` : '1px solid var(--border-primary)'
          }}>
            {count}
          </span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function RightSidePanel(props: any) {
  const debugState = useAppStore((s) => s.debugState);
  const validationErrors = useAppStore((s) => s.validationErrors);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['variables', 'watches']));

  const toggleSection = (id: string) => {
    const next = new Set(openSections);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenSections(next);
  };

  // Auto-expand logic
  React.useEffect(() => {
    const next = new Set(openSections);
    let changed = false;

    // 1. Breakpoints: Expand if paused on a breakpoint or if hit count changes
    const isPausedOnBP = debugState?.state && !debugState.state.isComplete && 
      debugState.breakpoints?.some(bp => bp.line === debugState.state?.currentLine && bp.isEnabled);
    
    if (isPausedOnBP && !next.has('breakpoints')) {
      next.add('breakpoints');
      changed = true;
    }

    // 2. Problems: Expand if there are validation errors
    if (validationErrors.length > 0 && !next.has('problems')) {
      next.add('problems');
      changed = true;
    }

    if (changed) {
      setOpenSections(next);
    }
  }, [debugState?.state?.currentLine, debugState?.breakpoints, validationErrors.length]);

  const variablesCount = debugState?.state?.variables?.length ?? 0;
  const watchesCount = debugState?.watches?.length ?? 0;
  const breakpointsCount = debugState?.breakpoints?.length ?? 0;
  const problemsCount = validationErrors.length;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      background: 'var(--bg-surface)',
      borderLeft: '1px solid var(--border-primary)',
      overflowY: 'auto',
      overflowX: 'hidden'
    }}>
      <AccordionSection
        id="variables"
        title="Variables"
        icon={<BarChart3 size={14} />}
        count={variablesCount}
        isOpen={openSections.has('variables')}
        onToggle={() => toggleSection('variables')}
      >
        <VariablesPanel />
      </AccordionSection>
      
      <AccordionSection
        id="watches"
        title="Watches"
        icon={<Eye size={14} />}
        count={watchesCount}
        isOpen={openSections.has('watches')}
        onToggle={() => toggleSection('watches')}
      >
        <InspectorPanel {...props} forceTab="watches" />
      </AccordionSection>

      <AccordionSection
        id="breakpoints"
        title="Breakpoints"
        icon={<Target size={14} />}
        count={breakpointsCount}
        isOpen={openSections.has('breakpoints')}
        onToggle={() => toggleSection('breakpoints')}
        color="var(--red)"
      >
        <InspectorPanel {...props} forceTab="breakpoints" />
      </AccordionSection>

      <AccordionSection
        id="problems"
        title="Problems"
        icon={<AlertCircle size={14} />}
        count={problemsCount}
        isOpen={openSections.has('problems')}
        onToggle={() => toggleSection('problems')}
        color="var(--red)"
      >
        <InspectorPanel {...props} forceTab="problems" />
      </AccordionSection>

      <div style={{ minHeight: 100, background: 'var(--bg-panel)', opacity: 0.1 }} />
    </div>
  );
}
