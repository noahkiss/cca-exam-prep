// Shared furniture for the four step renderers: the heading, the hint ladder,
// the post-grading panel, and the "you've been here before" note. Keeping these
// in one place is what stops each renderer from growing its own dialect of the
// study-page conventions.

import { useState } from 'react';
import { PRINCIPLES } from '@/data/reference';
import { Feedback } from '../Feedback';
import { HintPanel } from '../HintPanel';

const PRINCIPLE_BY_ID = Object.fromEntries(PRINCIPLES.map((p) => [p.id, p]));

export function StepHeading({ title }: { title: string }) {
  return (
    <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
  );
}

/**
 * The step's hint ladder. A classify/order step carries no elimination rule, so
 * it renders two levels; a quiz step passes the question's rule and gets three.
 * Renders nothing at all when there is no hint to give.
 */
export function StepHints({
  hint,
  principle,
  eliminationRule,
  level,
  onReveal,
}: {
  hint?: string;
  principle?: string;
  eliminationRule?: string;
  level: number;
  onReveal: () => void;
}) {
  if (!hint) return null;
  return (
    <HintPanel
      level={level}
      hint={hint}
      principle={principle ? PRINCIPLE_BY_ID[principle] : undefined}
      eliminationRule={eliminationRule}
      onReveal={onReveal}
    />
  );
}

export function StepFeedback({
  correct,
  explanation,
  tip,
  principle,
  eliminationRule,
}: {
  correct: boolean;
  explanation?: string;
  tip?: string;
  principle?: string;
  eliminationRule?: string;
}) {
  return (
    <div className="mt-6">
      <Feedback
        correct={correct}
        explanation={explanation}
        tip={tip}
        principle={principle}
        eliminationRule={eliminationRule}
      />
    </div>
  );
}

/**
 * Shown when the step already has a recorded outcome. The stored log keeps the
 * verdict, not the placements, so this reports what happened rather than trying
 * to restore the earlier attempt.
 *
 * Snapshotted at mount: submitting writes straight through to the store, so
 * reading the live prop would pop the note up mid-step to describe the attempt
 * just made as if it were a previous session's. The renderers are keyed by step
 * id, so the snapshot is exactly what was on record when the step was opened.
 */
export function PriorAttemptNote({
  recorded,
}: {
  recorded?: { correct: boolean | null; attempts: number; usedHint: boolean };
}) {
  const [onArrival] = useState(recorded);
  if (!onArrival) return null;
  const text =
    onArrival.correct === null
      ? 'You have already worked through this step.'
      : onArrival.correct
        ? `Answered correctly last time${onArrival.usedHint ? ', with a hint' : ''}.`
        : 'Missed last time — worth redoing from scratch.';
  return (
    <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
      {text}
      {onArrival.attempts > 1 && ` (${onArrival.attempts} attempts)`}
    </p>
  );
}

/**
 * Class list for a step's action row. On a phone a step runs several screens
 * tall — the largest classify step is 13 items — so the row pins to the bottom
 * of the viewport rather than sitting below content the reader hasn't reached
 * yet. It bleeds to the card's edges (`-mx-5` against the card's `p-5`) so the
 * pinned bar reads as chrome. Static from `sm:` up, where nothing is far enough
 * away to need it. Callers add their own justification.
 */
export const STEP_ACTION_ROW =
  'mt-6 flex items-center gap-3 max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-5 max-sm:border-t max-sm:border-slate-200 max-sm:bg-white/95 max-sm:px-5 max-sm:py-3 max-sm:backdrop-blur dark:max-sm:border-slate-800 dark:max-sm:bg-slate-900/95';

/** The submit/continue button used by every graded step. */
export function StepButton({
  children,
  onClick,
  disabled,
  variant = 'primary',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const classes =
    variant === 'primary'
      ? 'bg-indigo-600 text-white hover:bg-indigo-500'
      : 'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 whitespace-nowrap rounded-lg px-5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${classes}`}
    >
      {children}
    </button>
  );
}
