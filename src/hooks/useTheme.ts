// Applies the persisted theme preference to the document root and reacts to the
// OS setting when in "system" mode.

import { useEffect } from 'react';
import { useStore, setTheme } from './useStore';
import type { AppState } from '@/lib/storage';

export type ThemePref = AppState['theme'];

function applyTheme(pref: ThemePref) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = pref === 'dark' || (pref === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
}

export function useTheme(): { pref: ThemePref; setPref: (p: ThemePref) => void } {
  const { theme } = useStore();

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return { pref: theme, setPref: setTheme };
}
