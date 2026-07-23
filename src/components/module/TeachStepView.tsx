// Ungraded exposition. Body is plain text on `whitespace-pre-line`, exactly as
// ReferencePage renders principle bodies — no markdown renderer, no dependency.

import { useState } from 'react';
import type { TeachStep } from '@/types';
import type { StepOutcome } from './StepView';
import { Callout } from './Callout';
import { CodeBlockView } from './CodeBlockView';
import {
  PriorAttemptNote,
  STEP_ACTION_ROW,
  StepButton,
  StepHeading,
  StepHints,
} from './StepFrame';
import { ReferenceLink } from '../ReferenceLink';

export function TeachStepView({
  step,
  recorded,
  onGraded,
}: {
  step: TeachStep;
  recorded?: { correct: boolean | null; attempts: number; usedHint: boolean };
  onGraded: (outcome: StepOutcome) => void;
}) {
  const [hintLevel, setHintLevel] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div>
      <StepHeading title={step.title} />
      <PriorAttemptNote recorded={recorded} />

      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {step.body}
      </p>

      {step.code?.map((block, i) => (
        <CodeBlockView key={i} block={block} />
      ))}

      {step.callout && <Callout kind={step.callout.kind} body={step.callout.body} />}

      {step.tip && (
        <div className="mt-4 rounded-lg border-l-4 border-indigo-400 bg-slate-50 p-3 text-sm dark:border-indigo-500/60 dark:bg-slate-800/40">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            💡 Tip
          </h3>
          <p className="text-slate-700 dark:text-slate-300">{step.tip}</p>
        </div>
      )}

      <StepHints
        hint={step.hint}
        principle={step.principle}
        level={hintLevel}
        onReveal={() => setHintLevel((l) => l + 1)}
      />

      {step.principle && (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          Learn more: <ReferenceLink id={step.principle} />
        </p>
      )}

      <div className={`${STEP_ACTION_ROW} justify-end`}>
        {acknowledged ? (
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            ✓ Read
          </span>
        ) : (
          <StepButton
            onClick={() => {
              setAcknowledged(true);
              onGraded({ correct: null, usedHint: false });
            }}
          >
            Got it
          </StepButton>
        )}
      </div>
    </div>
  );
}
