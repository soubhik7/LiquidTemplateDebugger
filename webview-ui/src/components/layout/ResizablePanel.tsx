import { useRef, useState, useCallback, type ReactNode } from 'react';

interface ResizablePanelProps {
  direction: 'horizontal' | 'vertical';
  children: [ReactNode, ReactNode];
  initialSize?: number; // percentage for first panel
  minSize?: number; // pixels
  onSizeChange?: (size: number) => void;
  style?: React.CSSProperties;
  className?: string;
}

export function ResizablePanel({
  direction,
  children,
  initialSize = 50,
  minSize = 80,
  onSizeChange,
  style,
  className,
}: ResizablePanelProps) {
  const [size, setSize] = useState(initialSize);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const total = direction === 'horizontal' ? rect.width : rect.height;
      const startPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const startSize = size;

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const pos = direction === 'horizontal' ? ev.clientX : ev.clientY;
        const delta = pos - startPos;
        const newPct = startSize + (delta / total) * 100;
        const minPct = (minSize / total) * 100;
        const maxPct = 100 - minPct;
        const clamped = Math.max(minPct, Math.min(maxPct, newPct));
        setSize(clamped);
        onSizeChange?.(clamped);
      };

      const onUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [direction, size, minSize, onSizeChange]
  );

  const isH = direction === 'horizontal';

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        display: 'flex',
        flexDirection: isH ? 'row' : 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div style={{ flex: `0 0 ${size}%`, overflow: 'hidden', minWidth: isH ? minSize : undefined, minHeight: !isH ? minSize : undefined }}>
        {children[0]}
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={startDrag}
        style={{
          flexShrink: 0,
          width: isH ? 4 : '100%',
          height: isH ? '100%' : 4,
          cursor: isH ? 'col-resize' : 'row-resize',
          background: 'transparent',
          transition: 'background 0.2s',
          zIndex: 10,
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'var(--accent)';
        }}
        onMouseLeave={(e) => {
          if (!dragging.current)
            (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      />

      <div style={{ flex: 1, overflow: 'hidden', minWidth: isH ? minSize : undefined, minHeight: !isH ? minSize : undefined }}>
        {children[1]}
      </div>
    </div>
  );
}
