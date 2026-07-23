// Marks content the official Exam Guide rules out of scope. Deliberately loud —
// a candidate must never mistake supplementary drilling for exam prep, so this
// is a badge in the header row, not a footnote under the explanation.
//
// Renders nothing for blueprint content: the absence of a badge is the normal
// case and adding an "on the exam" badge everywhere would dilute this one.

import type { ExamScope } from '@/types';

export const SUPPLEMENTARY_NOTE =
  'Not on the CCA-F blueprint. Worth knowing as an engineer, but the exam cannot test it — this question is excluded from exam draws, scoring and mastery.';

export function ScopeBadge({ scope }: { scope?: ExamScope }) {
  if (scope !== 'supplementary') return null;
  return (
    <span
      title={SUPPLEMENTARY_NOTE}
      className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-300"
    >
      Not on the exam
    </span>
  );
}
