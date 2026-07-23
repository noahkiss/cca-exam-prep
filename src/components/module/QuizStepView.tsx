// A quiz step is a question from the bank, rendered through the same QuestionCard
// study and exam mode use. Reusing it is what brings the seeded option shuffle —
// and therefore the anti-slot-A protection — along for free; a second MCQ
// renderer here would quietly lose that.
//
// The step's own hint/explanation/tip win when authored, and fall back to the
// question's, so a module can reframe a question without the fields going dark.

import { useState } from 'react';
import type { QuizStep } from '@/types';
import { QUESTIONS_BY_ID } from '@/lib/questions';
import type { StepOutcome } from './StepView';
import { QuestionCard } from '../QuestionCard';
import { SUPPLEMENTARY_NOTE } from '../ScopeBadge';
import {
  PriorAttemptNote,
  StepButton,
  StepFeedback,
  StepHeading,
  StepHints,
} from './StepFrame';

export function QuizStepView({
  step,
  recorded,
  onGraded,
}: {
  step: QuizStep;
  recorded?: { correct: boolean | null; attempts: number; usedHint: boolean };
  onGraded: (outcome: StepOutcome) => void;
}) {
  const question = QUESTIONS_BY_ID[step.questionId];
  const [seed] = useState(() => Date.now().toString(36));
  const [selected, setSelected] = useState<number | null>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [revealed, setRevealed] = useState(false);

  // The loader drops quiz steps pointing at unknown questions, so this is a
  // belt-and-braces guard rather than an expected state.
  if (!question) return null;

  const correct = selected === question.answer;

  const submit = () => {
    if (selected === null) return;
    setRevealed(true);
    // Persistence is the page's job — this only reports the outcome upward.
    onGraded({ correct, usedHint: hintLevel > 0 });
  };

  return (
    <div>
      <StepHeading title={step.title} />
      <PriorAttemptNote recorded={recorded} />

      {question.examScope === 'supplementary' && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          {SUPPLEMENTARY_NOTE}
        </div>
      )}

      <QuestionCard
        question={question}
        seed={seed}
        selected={selected}
        onSelect={setSelected}
        revealed={revealed}
      />

      {!revealed && (
        <StepHints
          hint={step.hint ?? question.hint}
          principle={step.principle ?? question.principle}
          eliminationRule={question.eliminationRule}
          level={hintLevel}
          onReveal={() => setHintLevel((l) => l + 1)}
        />
      )}

      {!revealed && (
        <div className="mt-6 flex items-center justify-end">
          <StepButton onClick={submit} disabled={selected === null}>
            Check answer
          </StepButton>
        </div>
      )}

      {revealed && (
        <StepFeedback
          correct={correct}
          explanation={step.explanation ?? question.explanation}
          tip={step.tip ?? question.tip}
          principle={step.principle ?? question.principle}
          eliminationRule={question.eliminationRule}
        />
      )}
    </div>
  );
}
