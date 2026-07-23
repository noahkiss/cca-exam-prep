// Three visually distinct callout kinds. `contrast` is not decoration — it is
// the "wrong instinct vs right instinct" pairing the modules lean on, so it gets
// its own look rather than sharing `note`'s.

import type { TeachStep } from '@/types';

type Kind = NonNullable<TeachStep['callout']>['kind'];

const STYLES: Record<Kind, { wrapper: string; label: string; heading: string }> = {
  warn: {
    wrapper:
      'border border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10',
    label: 'text-amber-700 dark:text-amber-400',
    heading: '⚠ Watch out',
  },
  note: {
    wrapper:
      'border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60',
    label: 'text-slate-500 dark:text-slate-400',
    heading: '📌 Note',
  },
  contrast: {
    wrapper:
      'border border-indigo-200 border-l-4 border-l-indigo-500 bg-indigo-50 dark:border-indigo-500/30 dark:border-l-indigo-400 dark:bg-indigo-500/10',
    label: 'text-indigo-600 dark:text-indigo-400',
    heading: '⇄ Contrast',
  },
};

export function Callout({ kind, body }: { kind: Kind; body: string }) {
  const style = STYLES[kind];
  return (
    <div className={`my-4 rounded-xl p-4 ${style.wrapper}`}>
      <span
        className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${style.label}`}
      >
        {style.heading}
      </span>
      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {body}
      </p>
    </div>
  );
}
