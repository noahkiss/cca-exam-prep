import type { Question } from '@/types';
import { ReferenceLink } from './ReferenceLink';

/** Post-answer explanation panel: verdict, explanation, elimination rule, tip. */
export function Feedback({ correct, question }: { correct: boolean; question: Question }) {
  return (
    <div
      className={`rounded-xl border p-5 sm:p-6 ${
        correct
          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10'
          : 'border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10'
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`text-lg font-bold ${
            correct ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
          }`}
        >
          {correct ? '✓ Correct' : '✕ Not quite'}
        </span>
      </div>

      <div className="space-y-4 text-sm">
        <div>
          <h3 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Explanation</h3>
          <p className="leading-relaxed text-slate-700 dark:text-slate-300">
            {question.explanation}
          </p>
        </div>

        <div className="rounded-lg bg-white/60 p-3 dark:bg-slate-900/40">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Elimination rule
          </h3>
          <p className="text-slate-700 dark:text-slate-300">{question.eliminationRule}</p>
        </div>

        <div className="rounded-lg border-l-4 border-indigo-400 bg-white/60 p-3 dark:border-indigo-500/60 dark:bg-slate-900/40">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            💡 Tip
          </h3>
          <p className="text-slate-700 dark:text-slate-300">{question.tip}</p>
        </div>

        <div className="text-slate-600 dark:text-slate-400">
          Learn more: <ReferenceLink id={question.principle} />
        </div>
      </div>
    </div>
  );
}
