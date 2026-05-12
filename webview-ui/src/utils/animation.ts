import type { Variants } from 'framer-motion';

export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, x: -16, transition: { duration: 0.15 } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, x: 16, transition: { duration: 0.15 } },
};

export const expandDown: Variants = {
  hidden: { opacity: 0, height: 0, overflow: 'hidden' },
  visible: {
    opacity: 1,
    height: 'auto',
    overflow: 'hidden',
    transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    height: 0,
    overflow: 'hidden',
    transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: [0.34, 1.56, 0.64, 1] } },
  exit: { opacity: 0, scale: 0.94, transition: { duration: 0.15 } },
};

export const toastVariants: Variants = {
  hidden: { opacity: 0, x: 48, scale: 0.92 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] },
  },
  exit: { opacity: 0, x: 48, scale: 0.92, transition: { duration: 0.22 } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] } },
};

export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const modalContent: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, ease: [0.34, 1.56, 0.64, 1] },
  },
  exit: { opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.18 } },
};
