import { useEffect } from 'react';
import { useAppStore, getAccentHex } from '../store/useAppStore';

export function useTheme(): void {
  const theme = useAppStore((s) => s.theme);
  const accentColor = useAppStore((s) => s.accentColor);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const hex = getAccentHex(accentColor);
    // Convert hex to RGB components
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const rgb = `${r}, ${g}, ${b}`;

    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-rgb', rgb);
    document.documentElement.style.setProperty('--accent-soft', `rgba(${rgb}, 0.12)`);
    document.documentElement.style.setProperty('--accent-glow', `rgba(${rgb}, 0.28)`);
  }, [accentColor]);
}
