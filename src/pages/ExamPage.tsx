import { useCallback, useMemo, useState } from 'react';
import { QUESTIONS } from '@/lib/questions';
import { sampleExam, EXAM_SIZE } from '@/lib/sampling';
import { gradeAttempt, type GradedItem } from '@/lib/scoring';
import { recordAnswer, recordExam } from '@/hooks/useStore';
import { QuestionCard } from '@/components/QuestionCard';
import { Timer } from '@/components/Timer';
import { ExamResults } from '@/components/ExamResults';

const EXAM_MINUTES = 120;

type Phase = 'idle' | 'active' | 'done';

export function ExamPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [attemptId, setAttemptId] = useState('');
  const [deadline, setDeadline] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);

  const questions = useMemo(
    () => (phase === 'idle' ? [] : sampleExam(QUESTIONS, attemptId)),
    [phase, attemptId],
  );

  const start = () => {
    const id = `exam:${Date.now().toString(36)}`;
    setAttemptId(id);
    setAnswers({});
    setCurrent(0);
    setDeadline(Date.now() + EXAM_MINUTES * 60 * 1000);
    setPhase('active');
  };

  const results = useMemo(() => {
    if (phase !== 'done') return null;
    const items: GradedItem[] = questions.map((q) => ({
      question: q,
      chosen: q.id in answers ? answers[q.id] : null,
    }));
    return gradeAttempt(items);
  }, [phase, questions, answers]);

  const submit = useCallback(() => {
    setPhase((p) => {
      if (p !== 'active') return p;
      // Grade and persist once, at the transition to "done".
      const items: GradedItem[] = questions.map((q) => ({
        question: q,
        chosen: q.id in answers ? answers[q.id] : null,
      }));
      const res = gradeAttempt(items);
      recordExam({
        id: attemptId,
        date: Date.now(),
        scaled: res.scaled,
        passedStrict: res.passedStrict,
        total: res.total,
        correct: res.correct,
        domainScaled: Object.fromEntries(
          res.domains.filter((d) => d.scaled !== null).map((d) => [d.domain, d.scaled]),
        ),
      });
      // Feed each graded item into per-question stats + SM-2.
      for (const item of items) {
        recordAnswer({
          id: item.question.id,
          domain: item.question.domain,
          correct: item.chosen === item.question.answer,
          usedHint: false,
        });
      }
      return 'done';
    });
  }, [questions, answers, attemptId]);

  if (phase === 'idle') {
    return <ExamIntro onStart={start} bankSize={QUESTIONS.length} />;
  }

  if (phase === 'done' && results) {
    return (
      <ExamResults result={results} questions={questions} answers={answers} onRestart={() => setPhase('idle')} />
    );
  }

  const question = questions[current];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-10 -mx-4 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/95 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {answeredCount}
          </span>{' '}
          / {questions.length} answered
        </div>
        <Timer deadline={deadline} onExpire={submit} />
      </div>

      <QuestionNav
        count={questions.length}
        current={current}
        answered={questions.map((q) => q.id in answers)}
        onJump={setCurrent}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">
          Question {current + 1} of {questions.length}
        </div>
        <QuestionCard
          question={question}
          seed={attemptId}
          selected={question.id in answers ? answers[question.id] : null}
          onSelect={(canonical) =>
            setAnswers((a) => ({ ...a, [question.id]: canonical }))
          }
          revealed={false}
        />

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            ← Prev
          </button>
          {current < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Submit exam
            </button>
          )}
        </div>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={submit}
          className="text-sm font-medium text-slate-500 underline underline-offset-2 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Submit early ({answeredCount}/{questions.length} answered)
        </button>
      </div>
    </div>
  );
}

function ExamIntro({ onStart, bankSize }: { onStart: () => void; bankSize: number }) {
  const size = Math.min(EXAM_SIZE, bankSize);
  return (
    <div className="mx-auto max-w-xl space-y-5 text-center">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Practice exam</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-left text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <ul className="space-y-2">
          <li>
            <strong className="text-slate-900 dark:text-slate-100">{size} questions</strong>{' '}
            {bankSize < EXAM_SIZE && `(bank has ${bankSize}; the real exam is ${EXAM_SIZE})`}
          </li>
          <li>
            <strong className="text-slate-900 dark:text-slate-100">120-minute</strong> countdown —
            auto-submits at zero.
          </li>
          <li>Drawn from 4 of the 6 scenario sets, like the real exam.</li>
          <li>No feedback until you submit. Scored 0–1000, pass at 720.</li>
          <li>Every domain must clear the bar — not just the overall average.</li>
        </ul>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        Start exam
      </button>
    </div>
  );
}

function QuestionNav({
  count,
  current,
  answered,
  onJump,
}: {
  count: number;
  current: number;
  answered: boolean[];
  onJump: (i: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Question navigator">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onJump(i)}
          aria-current={i === current}
          className={`h-8 w-8 rounded-md text-xs font-semibold transition-colors ${
            i === current
              ? 'bg-indigo-600 text-white'
              : answered[i]
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
          }`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
}
