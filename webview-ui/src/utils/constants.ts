import type { AccentColor, Theme } from '../types/app';

export const THEMES: { value: Theme; label: string; icon: string }[] = [
  { value: 'dark', label: 'Dark', icon: '🌑' },
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark-warm', label: 'Dark Warm', icon: '🔥' },
  { value: 'light-warm', label: 'Light Warm', icon: '🌅' },
  { value: 'dark-cool', label: 'Dark Cool', icon: '🌊' },
  { value: 'light-cool', label: 'Light Cool', icon: '❄️' },
];

export const ACCENT_COLORS: { value: AccentColor; hex: string; label: string }[] = [
  { value: 'indigo', hex: '#6366f1', label: 'Indigo' },
  { value: 'violet', hex: '#8b5cf6', label: 'Violet' },
  { value: 'blue', hex: '#3b82f6', label: 'Blue' },
  { value: 'cyan', hex: '#06b6d4', label: 'Cyan' },
  { value: 'emerald', hex: '#10b981', label: 'Emerald' },
  { value: 'orange', hex: '#f97316', label: 'Orange' },
  { value: 'rose', hex: '#f43f5e', label: 'Rose' },
];

export const SCOPE_COLORS: Record<string, string> = {
  input: 'var(--green)',
  global: 'var(--green)',
  assign: 'var(--yellow)',
  for: 'var(--purple)',
  capture: 'var(--orange)',
  increment: 'var(--cyan)',
  decrement: 'var(--cyan)',
  root: 'var(--text-muted)',
};

export const STEP_ACTIONS = [
  { id: 'continue', key: 'F5', label: 'Continue', icon: 'Play' },
  { id: 'breakpoint', key: 'F9', label: 'Breakpoint', icon: 'CircleDot' },
  { id: 'over', key: 'F10', label: 'Step Over', icon: 'CornerDownRight' },
  { id: 'into', key: 'F11', label: 'Step Into', icon: 'ArrowDown' },
  { id: 'out', key: '⇧F11', label: 'Step Out', icon: 'ArrowUp' },
] as const;
