import { useMemo, useState } from 'react';
import { QUESTIONS_BY_ID } from '@/lib/questions';
import { dueCards } from '@/lib/srs';
import { recordAnswer, useStore } from '@/hooks/useStore';
import { QuestionCard } from '@/components/QuestionCard';
import { Feedback } from '@/components/Feedback';

type Mode = 'missed' | 'due';

export function ReviewPage() {
  const state = useStore();
  const [mode, setMode] = useState<Mode>('missed');
  const [sessionSeed] = useState(() => Date.now().toString(36));
  const [pos, setPos] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const missedIds = useMemo(
    () => state.missed.filter((id) => id in QUESTIONS_BY_ID),
    [state.missed],
  );
  const dueIds = useMemo(
    () => dueCards(Object.values(state.srs)).map((c) => c.id).filter((id) => id in QUESTIONS_BY_ID),
    [state.srs],
  );

  // Snapshot the queue when the session/mode starts so answering doesn't shift it.
  const queue = useMemo(() => {
    const ids = mode === 'missed' ? missedIds : dueIds;
    return [...ids];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sessionSeed]);

  const question = queue[pos] ? QUESTIONS_BY_ID[queue[pos]] : undefined;

  const switchMode = (m: Mode) => {
    setMode(m);
    setPos(0);
    setSelected(null);
    setRevealed(false);
  };

  const submit = () => {
    if (selected === null || !question) return;
    setRevealed(true);
    recordAnswer({
      id: question.id,
      domain: question.domain,
      correct: selected === question.answer,
      usedHint: false,
    });
  };

  const next = () => {
    setSelected(null);
    setRevealed(false);
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
          : 'Spaced-repetition queue. Cards resurface on an SM-2 schedule; clean recalls stretch the interval, misses bring them back soon.'}
      </p>

      {!question ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          {pos > 0 ? '🎉 Queue complete for now.' : 'Nothing here yet — answer some questions in Study or Exam mode first.'}
        </div>
      ) : (
        <>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {pos + 1} of {queue.length}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            <QuestionCard
              question={question}
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
                <button
                  type="button"
                  onClick={next}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  {pos < queue.length - 1 ? 'Next →' : 'Finish'}
                </button>
              )}
            </div>
          </div>
          {revealed && <Feedback correct={selected === question.answer} question={question} />}
        </>
      )}
    </div>
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
