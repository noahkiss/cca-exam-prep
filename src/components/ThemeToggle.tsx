import { useTheme, type ThemePref } from '@/hooks/useTheme';

const ORDER: ThemePref[] = ['system', 'light', 'dark'];
const LABEL: Record<ThemePref, string> = { system: 'Auto', light: 'Light', dark: 'Dark' };
const ICON: Record<ThemePref, string> = { system: '🖥️', light: '☀️', dark: '🌙' };

export function ThemeToggle() {
  const { pref, setPref } = useTheme();
  const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
  return (
    <button
      type="button"
      onClick={() => setPref(next)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      title={`Theme: ${LABEL[pref]} (click for ${LABEL[next]})`}
      aria-label={`Switch theme, currently ${LABEL[pref]}`}
    >
      <span aria-hidden>{ICON[pref]}</span>
      <span className="hidden sm:inline">{LABEL[pref]}</span>
    </button>
  );
}
