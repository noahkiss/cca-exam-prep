// The seam between a learning module page and the step renderers.
//
// StepView renders the step body and nothing else: no prev/next, no progress
// bar, no module header — the page owns all of that — and it never persists.
// It reports each submission through `onGraded` and lets the page decide what
// that means for the attempt log.
//
// The switch is exhaustive with a `never` default on purpose. When `diagnose`,
// `build`, `trace` or `reflect` join the ModuleStep union, an unimplemented
// renderer is a compile error rather than a blank card in production.

import type { LearningModule, ModuleStep } from '@/types';
import { ClassifyStepView } from './ClassifyStepView';
import { OrderStepView } from './OrderStepView';
import { QuizStepView } from './QuizStepView';
import { TeachStepView } from './TeachStepView';

export interface StepOutcome {
  /** null for ungraded `teach` steps. */
  correct: boolean | null;
  usedHint: boolean;
}

export interface StepViewProps {
  module: LearningModule;
  step: ModuleStep;
  /** Previously recorded outcome, when revisiting an already-done step. */
  recorded?: { correct: boolean | null; attempts: number; usedHint: boolean };
  /** Fired once per submission (and once when a teach step is acknowledged). The page persists it. */
  onGraded: (outcome: StepOutcome) => void;
}

export function StepView({ step, recorded, onGraded }: StepViewProps) {
  // Keyed by step id so moving between steps resets the renderer's working
  // state — a half-filled classify grid must not follow the user to the next
  // step just because React reused the instance.
  switch (step.type) {
    case 'teach':
      return (
        <TeachStepView key={step.id} step={step} recorded={recorded} onGraded={onGraded} />
      );
    case 'classify':
      return (
        <ClassifyStepView key={step.id} step={step} recorded={recorded} onGraded={onGraded} />
      );
    case 'order':
      return (
        <OrderStepView key={step.id} step={step} recorded={recorded} onGraded={onGraded} />
      );
    case 'quiz':
      return (
        <QuizStepView key={step.id} step={step} recorded={recorded} onGraded={onGraded} />
      );
    default: {
      const exhaustive: never = step;
      return exhaustive;
    }
  }
}
