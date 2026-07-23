// Put stages in sequence. Up/down buttons rather than dragging: they are real
// tab stops, they work on a phone, and no step exceeds seven items.
//
// The authored `items` array is in `correctOrder` — content is written that way
// so the key reads naturally — so the working order MUST start shuffled, and the
// shuffle has to be rotated off any order that would already grade as correct.

import { useMemo, useState } from 'react';
import type { OrderStep } from '@/types';
import { gradeOrder } from '@/lib/modules';
import { seededPermutation } from '@/lib/rng';
import type { StepOutcome } from './StepView';
import {
  PriorAttemptNote,
  STEP_ACTION_ROW,
  StepButton,
  StepFeedback,
  StepHeading,
  StepHints,
} from './StepFrame';

const sameSeq = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, i) => b[i] === id);

function startingOrder(step: OrderStep): string[] {
  const ids = step.items.map((i) => i.id);
  let order = seededPermutation(ids.length, `order:${step.id}`).map((i) => ids[i]);
  // A shuffle that happens to be a keyed answer would hand the step away.
  for (let n = 0; n < ids.length && gradeOrder(step, order); n++) {
    order = [...order.slice(1), order[0]];
  }
  return order;
}

export function OrderStepView({
  step,
  recorded,
  onGraded,
}: {
  step: OrderStep;
  recorded?: { correct: boolean | null; attempts: number; usedHint: boolean };
  onGraded: (outcome: StepOutcome) => void;
}) {
  const [order, setOrder] = useState<string[]>(() => startingOrder(step));
  const [hintLevel, setHintLevel] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);

  const graded = result !== null;
  const labelById = useMemo(
    () => Object.fromEntries(step.items.map((i) => [i.id, i.label])),
    [step],
  );

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    setOrder(next);
  };

  const submit = () => {
    const correct = gradeOrder(step, order);
    setResult(correct);
    onGraded({ correct, usedHint: hintLevel > 0 });
  };

  // What to reveal: the sequence they matched when they were right, otherwise
  // the canonical key. An accepted alternate is called out explicitly — one step
  // exists purely to teach that two of its stages commute.
  const matchedAlternate = result === true && !sameSeq(order, step.correctOrder);
  const target = matchedAlternate ? order : step.correctOrder;

  return (
    <div>
      <StepHeading title={step.title} />
      <PriorAttemptNote recorded={recorded} />

      <p className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
        {step.prompt}
      </p>

      {!graded ? (
        <ol className="space-y-2">
          {order.map((id, i) => (
            <li
              key={id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs font-bold text-slate-500 dark:border-slate-600 dark:text-slate-400"
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-slate-800 dark:text-slate-200">
                {labelById[id]}
              </span>
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Move "${labelById[id]}" earlier`}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={i === order.length - 1}
                  aria-label={`Move "${labelById[id]}" later`}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  ↓
                </button>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <ol className="space-y-2">
          {target.map((id, i) => {
            const submittedAt = order.indexOf(id);
            const inPlace = submittedAt === i;
            return (
              <li
                key={id}
                className={`rounded-lg border p-3 ${
                  inPlace
                    ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500/60 dark:bg-emerald-500/10'
                    : 'border-rose-500 bg-rose-50 dark:border-rose-500/60 dark:bg-rose-500/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs font-bold text-slate-500 dark:border-slate-600 dark:text-slate-400"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {labelById[id]}
                  </span>
                  {!inPlace && (
                    <span className="shrink-0 text-xs text-rose-700 dark:text-rose-300">
                      you had it at {submittedAt + 1}
                    </span>
                  )}
                </div>
                {step.why[id] && (
                  <p className="mt-2 pl-9 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {step.why[id]}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {matchedAlternate && (
        <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
          Your sequence isn’t the one written as the key, but it is an accepted
          alternate — those stages genuinely commute, so both orders are right.
        </p>
      )}

      {!graded && (
        <StepHints
          hint={step.hint}
          principle={step.principle}
          level={hintLevel}
          onReveal={() => setHintLevel((l) => l + 1)}
        />
      )}

      <div className={`${STEP_ACTION_ROW} justify-end`}>
        {graded ? (
          <StepButton variant="secondary" onClick={() => setResult(null)}>
            Try again
          </StepButton>
        ) : (
          <StepButton onClick={submit}>Check order</StepButton>
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
