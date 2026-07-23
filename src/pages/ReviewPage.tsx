import { useMemo, useState } from 'react';
import type { ClassifyStep, LearningModule, OrderStep, Question } from '@/types';
import { QUESTIONS_BY_ID } from '@/lib/questions';
import { STEP_BY_KEY } from '@/lib/modules';
import { dueCards } from '@/lib/srs';
import { recordAnswer, recordStep, useStore } from '@/hooks/useStore';
import { QuestionCard } from '@/components/QuestionCard';
import { Feedback } from '@/components/Feedback';
import { ClassifyStepView } from '@/components/module/ClassifyStepView';
import { OrderStepView } from '@/components/module/OrderStepView';
import type { StepOutcome } from '@/components/module/StepView';

type Mode = 'missed' | 'due';

/**
 * What an SM-2 card id resolves to. The queue mixes two namespaces — bank
 * question ids and `mod:<module>:<step>` keys — and a stored card can outlive
 * the content it points at, so resolution is allowed to fail and the caller
 * drops the card silently rather than rendering a blank one.
 *
 * Only classify and order steps are reviewable here: `teach` steps are ungraded
 * (they never get a card) and `quiz` steps are scheduled under their real
 * question id, so anything else is a card left behind by a content edit.
 */
type ReviewCard =
  | { kind: 'question'; question: Question }
  | { kind: 'step'; module: LearningModule; step: ClassifyStep | OrderStep };

/** Exported for unit testing — this is the queue's whole namespace contract. */
// eslint-disable-next-line react-refresh/only-export-components -- test seam, not a component
export function resolveCard(id: string): ReviewCard | undefined {
  const question = QUESTIONS_BY_ID[id];
  if (question) return { kind: 'question', question };
  const entry = STEP_BY_KEY[id];
  if (entry && (entry.step.type === 'classify' || entry.step.type === 'order')) {
    return { kind: 'step', module: entry.module, step: entry.step };
  }
  return undefined;
}

export function ReviewPage() {
  const state = useStore();
  const [mode, setMode] = useState<Mode>('missed');
  const [sessionSeed] = useState(() => Date.now().toString(36));
  const [pos, setPos] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [stepGraded, setStepGraded] = useState(false);

  const missedIds = useMemo(
    () => state.missed.filter((id) => id in QUESTIONS_BY_ID),
    [state.missed],
  );
  const dueIds = useMemo(
    () => dueCards(Object.values(state.srs)).map((c) => c.id).filter((id) => resolveCard(id) !== undefined),
    [state.srs],
  );

  // Snapshot the queue when the session/mode starts so answering doesn't shift it.
  const queue = useMemo(() => {
    const ids = mode === 'missed' ? missedIds : dueIds;
    return [...ids];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sessionSeed]);

  const cardId = queue[pos];
  const card = cardId ? resolveCard(cardId) : undefined;
  const question = card?.kind === 'question' ? card.question : undefined;

  // Every per-card local state lives here, so both mode switching and advancing
  // clear it — the second card must never inherit the first's answer.
  const resetCardState = () => {
    setSelected(null);
    setRevealed(false);
    setStepGraded(false);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setPos(0);
    resetCardState();
  };

  const submit = () => {
    if (selected === null || !question) return;
    setRevealed(true);
    recordAnswer({
      id: question.id,
      domain: question.domain,
      correct: selected === question.answer,
      usedHint: false,
      mode: 'review',
    });
  };

  // Classify/order steps grade themselves and render their own submit button and
  // feedback, so all this page does is persist the outcome and unlock "Next".
  const onStepGraded = (outcome: StepOutcome) => {
    if (card?.kind !== 'step' || outcome.correct === null) return;
    setStepGraded(true);
    recordStep({
      moduleId: card.module.id,
      stepId: card.step.id,
      correct: outcome.correct,
      usedHint: outcome.usedHint,
      mode: 'review',
    });
  };

  const next = () => {
    resetCardState();
    setPos((p) => p + 1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Review</h1>

      <div className="flex flex-wrap gap-2">
        <ModeTab active={mode === 'missed'} onClick={() => switchMode('missed')} label="Redo missed" count={missedIds.length} />
        <ModeTab active={mode === 'due'} onClick={() => switchMode('due')} label="Due for review (SM-2)" count={dueIds.length} />
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400">
        {mode === 'missed'
          ? 'Every question you have missed at least once. Answer it correctly to retire it from this list.'
          : 'Spaced-repetition queue — questions and graded module exercises alike. Cards resurface on an SM-2 schedule; clean recalls stretch the interval, misses bring them back soon.'}
      </p>

      {!card ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          {pos > 0 ? '🎉 Queue complete for now.' : 'Nothing here yet — answer some questions in Study or Exam mode first.'}
        </div>
      ) : (
        <>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {pos + 1} of {queue.length}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            {card.kind === 'question' ? (
              <>
                <QuestionCard
                  question={card.question}
                  seed={`${sessionSeed}:${pos}`}
                  selected={selected}
                  onSelect={setSelected}
                  revealed={revealed}
                />
                <div className="mt-6 flex justify-end">
                  {!revealed ? (
                    <button
                      type="button"
                      onClick={submit}
                      disabled={selected === null}
                      className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
                    >
                      Check answer
                    </button>
                  ) : (
                    <NextButton onClick={next} last={pos === queue.length - 1} />
                  )}
                </div>
              </>
            ) : (
              <>
                {/* A module step in a queue of exam questions is a context switch,
                    so name where it came from before the prompt lands. */}
                <p className="mb-4 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  Module step · {card.module.title}
                </p>
                {/* Keyed by card id: the renderers hold their own placements, and
                    reusing an instance would carry them to the next card. */}
                {card.step.type === 'classify' ? (
                  <ClassifyStepView key={cardId} step={card.step} onGraded={onStepGraded} />
                ) : (
                  <OrderStepView key={cardId} step={card.step} onGraded={onStepGraded} />
                )}
                {stepGraded && (
                  <div className="mt-6 flex justify-end">
                    <NextButton onClick={next} last={pos === queue.length - 1} />
                  </div>
                )}
              </>
            )}
          </div>
          {card.kind === 'question' && revealed && (
            <Feedback
              correct={selected === card.question.answer}
              explanation={card.question.explanation}
              tip={card.question.tip}
              principle={card.question.principle}
              eliminationRule={card.question.eliminationRule}
            />
          )}
        </>
      )}
    </div>
  );
}

function NextButton({ onClick, last }: { onClick: () => void; last: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
    >
      {last ? 'Finish' : 'Next →'}
    </button>
  );
}

function ModeTab({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      {label}
      <span className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${active ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
        {count}
      </span>
    </button>
  );
}
