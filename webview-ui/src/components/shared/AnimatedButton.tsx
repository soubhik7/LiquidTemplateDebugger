import { motion, HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'surface';

interface AnimatedButtonProps extends HTMLMotionProps<'button'> {
  variant?: Variant;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  children?: ReactNode;
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--accent)',
    color: '#fff',
    border: '1px solid transparent',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-primary)',
  },
  danger: {
    background: 'rgba(239,68,68,0.1)',
    color: 'var(--red)',
    border: '1px solid rgba(239,68,68,0.2)',
  },
  surface: {
    background: 'var(--bg-panel)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-primary)',
  },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  xs: { padding: '2px 8px', fontSize: '11px', borderRadius: 'var(--radius-sm)' },
  sm: { padding: '4px 10px', fontSize: '12px', borderRadius: 'var(--radius-sm)' },
  md: { padding: '6px 14px', fontSize: '13px', borderRadius: 'var(--radius-md)' },
  lg: { padding: '10px 20px', fontSize: '14px', borderRadius: 'var(--radius-lg)' },
};

export function AnimatedButton({
  variant = 'surface',
  size = 'sm',
  icon,
  children,
  disabled,
  style,
  whileHover,
  whileTap,
  ...rest
}: AnimatedButtonProps) {
  return (
    <motion.button
      whileHover={whileHover || (disabled ? {} : { scale: 1.02, filter: 'brightness(1.1)' })}
      whileTap={whileTap || (disabled ? {} : { scale: 0.96 })}
      transition={{ duration: 0.12 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontFamily: 'var(--font-sans)',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        whiteSpace: 'nowrap',
        outline: 'none',
        transition: 'all var(--transition-fast)',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      disabled={disabled}
      {...rest}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </motion.button>
  );
}
