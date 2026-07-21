import type { Principle } from '@/types';

// Progressive hints: nudge → the relevant principle/concept → near-give (the
// elimination rule that applies). None of the levels name the correct option.

export function HintPanel({
  level,
  hint,
  principle,
  eliminationRule,
  onReveal,
}: {
  level: number;
  hint: string;
  principle: Principle | undefined;
  eliminationRule: string;
  onReveal: () => void;
}) {
  const steps: { label: string; body: string }[] = [
    { label: 'Nudge', body: hint },
    {
      label: 'Principle',
      body: principle ? `${principle.title}\n\n${principle.body.split('\n\n')[0]}` : hint,
    },
    {
      label: 'Elimination rule',
      body: `An answer is almost certainly wrong if it ${lowerFirst(eliminationRule)}`,
    },
  ];

  const shown = steps.slice(0, level);
  const canReveal = level < steps.length;

  return (
    <div className="mt-5">
      {shown.length > 0 && (
        <div className="space-y-2">
          {shown.map((s, i) => (
            <div
              key={i}
              className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"
            >
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Hint {i + 1} · {s.label}
              </span>
              <p className="whitespace-pre-line text-amber-900 dark:text-amber-100">{s.body}</p>
            </div>
          ))}
        </div>
      )}
      {canReveal && (
        <button
          type="button"
          onClick={onReveal}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-400 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-500/50 dark:text-amber-300 dark:hover:bg-amber-500/10"
        >
          💡 {level === 0 ? 'Need a hint?' : 'Reveal another hint'}
        </button>
      )}
    </div>
  );
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
