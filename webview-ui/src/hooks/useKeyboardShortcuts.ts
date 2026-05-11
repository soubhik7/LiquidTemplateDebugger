import { useEffect } from 'react';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      for (const s of shortcuts) {
        const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey || !s.shift;
        const metaMatch = s.meta ? e.metaKey : true;

        if (
          e.key === s.key &&
          ctrlMatch &&
          shiftMatch &&
          metaMatch
        ) {
          e.preventDefault();
          s.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
