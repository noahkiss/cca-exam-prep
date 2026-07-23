// Reusable question renderer used by study, exam, and redo modes. Owns the
// seeded option-order shuffle; grading/feedback logic lives in the caller.
//
// Option order is shuffled deterministically from `seed` (per question id +
// attempt), so the layout is stable across re-renders but varies per attempt —
// defeating the "answer is always slot A" tell. Selection is reported in the
// question's CANONICAL option index so grading stays keyed to `answer`.

import { useMemo } from 'react';
import type { Question } from '@/types';
import { seededPermutation } from '@/lib/rng';
import { DomainBadge } from './DomainBadge';
import { ScopeBadge } from './ScopeBadge';

const SLOT_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function QuestionCard({
  question,
  seed,
  selected,
  onSelect,
  revealed,
  showDomain = true,
}: {
  question: Question;
  seed: string;
  /** Canonical option index the user has chosen, or null. */
  selected: number | null;
  onSelect: (canonicalIndex: number) => void;
  /** When true, colour options by correctness and lock input. */
  revealed: boolean;
  showDomain?: boolean;
}) {
  // displaySlot → canonical source index
  const order = useMemo(
    () => seededPermutation(question.options.length, `${seed}:${question.id}`),
    [question.id, question.options.length, seed],
  );

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {showDomain && <DomainBadge domain={question.domain} />}
        <ScopeBadge scope={question.examScope} />
        <span className="text-xs text-slate-400 dark:text-slate-500">{question.id}</span>
      </div>

      <p className="mb-4 rounded-lg border-l-4 border-slate-300 bg-slate-100 p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
        {question.scenario}
      </p>

      <p className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
        {question.question}
      </p>

      <ul className="space-y-2.5" role="radiogroup" aria-label="Answer options">
        {order.map((canonical, slot) => {
          const isSelected = selected === canonical;
          const isCorrect = canonical === question.answer;

          let stateClasses =
            'border-slate-300 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800';
          if (revealed) {
            if (isCorrect) {
              stateClasses =
                'border-emerald-500 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-500/10';
            } else if (isSelected) {
              stateClasses =
                'border-rose-500 bg-rose-50 dark:border-rose-500/60 dark:bg-rose-500/10';
            } else {
              stateClasses = 'border-slate-200 opacity-70 dark:border-slate-800';
            }
          } else if (isSelected) {
            stateClasses =
              'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 dark:border-indigo-400 dark:bg-indigo-500/10';
          }

          return (
            <li key={canonical}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={revealed}
                onClick={() => onSelect(canonical)}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors disabled:cursor-default ${stateClasses}`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    isSelected
                      ? 'border-transparent bg-indigo-600 text-white'
                      : 'border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400'
                  }`}
                  aria-hidden
                >
                  {SLOT_LABELS[slot]}
                </span>
                <span className="text-slate-800 dark:text-slate-200">
                  {question.options[canonical]}
                </span>
                {revealed && isCorrect && (
                  <span className="ml-auto shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="correct">
                    ✓
                  </span>
                )}
                {revealed && isSelected && !isCorrect && (
                  <span className="ml-auto shrink-0 text-rose-600 dark:text-rose-400" aria-label="your choice">
                    ✕
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
