import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TreeViewProps {
  data: any;
  label?: string;
  depth?: number;
  isLast?: boolean;
}

export function TreeView({ data, label, depth = 0, isLast = true }: TreeViewProps) {
  const [isOpen, setIsOpen] = useState(depth < 2); // Auto-open top levels

  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);
  const type = typeof data;

  const toggle = () => isObject && setIsOpen(!isOpen);

  const renderValue = () => {
    if (data === null) return <span style={{ color: 'var(--text-muted)' }}>null</span>;
    if (type === 'string') return <span style={{ color: 'var(--green)' }}>"{data}"</span>;
    if (type === 'number') return <span style={{ color: 'var(--blue)' }}>{data}</span>;
    if (type === 'boolean') return <span style={{ color: 'var(--purple)' }}>{String(data)}</span>;
    if (isArray) return <span style={{ color: 'var(--text-muted)' }}>Array({data.length})</span>;
    if (isObject) return <span style={{ color: 'var(--text-muted)' }}>Object</span>;
    return <span>{String(data)}</span>;
  };

  return (
    <div style={{ marginLeft: depth > 0 ? 16 : 0, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      <div 
        onClick={toggle}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 4, 
          padding: '2px 4px',
          cursor: isObject ? 'pointer' : 'default',
          borderRadius: 4,
          transition: 'background 0.1s',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => isObject && (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={(e) => isObject && (e.currentTarget.style.background = 'transparent')}
      >
        {isObject ? (
          <span style={{ color: 'var(--text-muted)', display: 'flex' }}>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : (
          <span style={{ width: 14 }} />
        )}
        
        {label && (
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{label}:</span>
        )}
        
        {renderValue()}
      </div>

      <AnimatePresence>
        {isObject && isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            {Object.entries(data).map(([key, val], idx, arr) => (
              <TreeView 
                key={key} 
                label={isArray ? undefined : key} 
                data={val} 
                depth={depth + 1} 
                isLast={idx === arr.length - 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
