// Sort items into buckets. The sizing constraint drives the whole interaction:
// the largest authored step is 6 buckets × 13 items, and it has to work on a
// phone. Drag-and-drop at that size is unusable and inaccessible, so each item
// carries its own bucket chooser — a row of chips that is a plain tab stop each,
// with no selection mode to get lost in. The bucket blurbs are shown once in a
// legend rather than repeated under all thirteen items.

import { useState } from 'react';
import type { ClassifyStep } from '@/types';
import { gradeClassify } from '@/lib/modules';
import type { StepOutcome } from './StepView';
import {
  PriorAttemptNote,
  StepButton,
  StepFeedback,
  StepHeading,
  StepHints,
} from './StepFrame';

export function ClassifyStepView({
  step,
  recorded,
  onGraded,
}: {
  step: ClassifyStep;
  recorded?: { correct: boolean | null; attempts: number; usedHint: boolean };
  onGraded: (outcome: StepOutcome) => void;
}) {
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [hintLevel, setHintLevel] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);

  const graded = result !== null;
  const unplaced = step.items.filter((i) => !placed[i.id]).length;
  const labelOf = (bucketId: string) =>
    step.buckets.find((b) => b.id === bucketId)?.label ?? bucketId;

  const submit = () => {
    const correct = gradeClassify(step, placed);
    setResult(correct);
    onGraded({ correct, usedHint: hintLevel > 0 });
  };

  return (
    <div>
      <StepHeading title={step.title} />
      <PriorAttemptNote recorded={recorded} />

      <p className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
        {step.prompt}
      </p>

      <dl className="mb-5 grid gap-2 sm:grid-cols-2">
        {step.buckets.map((b) => (
          <div
            key={b.id}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40"
          >
            <dt className="text-sm font-semibold text-slate-800 dark:text-slate-200">{b.label}</dt>
            {b.blurb && (
              <dd className="text-xs text-slate-500 dark:text-slate-400">{b.blurb}</dd>
            )}
          </div>
        ))}
      </dl>

      <ul className="space-y-3">
        {step.items.map((item) => {
          const chosen = placed[item.id];
          const itemRight = chosen === item.bucket;

          let stateClasses = 'border-slate-200 dark:border-slate-800';
          if (graded) {
            stateClasses = itemRight
              ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-500/10'
              : 'border-rose-500 bg-rose-50 dark:border-rose-500/60 dark:bg-rose-500/10';
          }

          return (
            <li key={item.id} className={`rounded-xl border p-3 ${stateClasses}`}>
              <p
                id={`item-${step.id}-${item.id}`}
                className="mb-2 text-sm text-slate-800 dark:text-slate-200"
              >
                {item.text}
              </p>

              <div
                role="radiogroup"
                aria-labelledby={`item-${step.id}-${item.id}`}
                className="flex flex-wrap gap-1.5"
              >
                {step.buckets.map((b) => {
                  const isChosen = chosen === b.id;
                  const isKey = graded && b.id === item.bucket;

                  let chipClasses =
                    'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800';
                  if (isKey) {
                    chipClasses =
                      'border-emerald-500 bg-emerald-100 text-emerald-800 dark:border-emerald-500/60 dark:bg-emerald-500/20 dark:text-emerald-200';
                  } else if (isChosen && graded) {
                    chipClasses =
                      'border-rose-500 bg-rose-100 text-rose-800 dark:border-rose-500/60 dark:bg-rose-500/20 dark:text-rose-200';
                  } else if (isChosen) {
                    chipClasses =
                      'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300';
                  }

                  return (
                    <button
                      key={b.id}
                      type="button"
                      role="radio"
                      aria-checked={isChosen}
                      disabled={graded}
                      onClick={() => setPlaced((p) => ({ ...p, [item.id]: b.id }))}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-default ${chipClasses}`}
                    >
                      {b.label}
                      {isKey && !isChosen && <span aria-label=" (correct)"> ✓</span>}
                    </button>
                  );
                })}
              </div>

              {graded && (
                <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {!itemRight && (
                    <span className="font-semibold">
                      Belongs in {labelOf(item.bucket)}, not {labelOf(chosen)}.{' '}
                    </span>
                  )}
                  {item.why}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {!graded && (
        <StepHints
          hint={step.hint}
          principle={step.principle}
          level={hintLevel}
          onReveal={() => setHintLevel((l) => l + 1)}
        />
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {!graded &&
            unplaced > 0 &&
            `${unplaced} of ${step.items.length} still unplaced`}
        </span>
        {graded ? (
          <StepButton variant="secondary" onClick={() => setResult(null)}>
            Try again
          </StepButton>
        ) : (
          <StepButton onClick={submit} disabled={unplaced > 0}>
            Check placements
          </StepButton>
        )}
      </div>

      {graded && (
        <StepFeedback
          correct={result}
          explanation={step.explanation}
          tip={step.tip}
          principle={step.principle}
        />
      )}
    </div>
  );
}
