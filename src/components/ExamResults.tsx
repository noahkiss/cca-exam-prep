import { useState } from 'react';
import type { Question } from '@/types';
import { DOMAIN_BY_ID } from '@/types';
import { type ScoreResult, PASS_THRESHOLD, MAX_SCORE } from '@/lib/scoring';
import { DOMAIN_STYLES } from '@/lib/domainStyles';
import { ScoreBar } from './ScoreBar';
import { DomainBadge } from './DomainBadge';
import { QuestionCard } from './QuestionCard';
import { Feedback } from './Feedback';

export function ExamResults({
  result,
  questions,
  answers,
  onRestart,
}: {
  result: ScoreResult;
  questions: Question[];
  answers: Record<string, number>;
  onRestart: () => void;
}) {
  const [reviewing, setReviewing] = useState(false);
  // The real exam passes on the total scaled score alone — section scores are
  // a study diagnostic, not a gate. Verdict tracks the total.
  const pass = result.overallPassed;

  return (
    <div className="space-y-6">
      <div
        className={`rounded-xl border p-6 text-center ${
          pass
            ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10'
            : 'border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10'
        }`}
      >
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {pass ? 'You would pass' : 'You would not pass yet'}
        </div>
        <div
          className={`mt-1 text-5xl font-bold tabular-nums ${
            pass ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {result.scaled}
          <span className="text-2xl text-slate-400 dark:text-slate-500"> / {MAX_SCORE}</span>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {result.correct} of {result.total} correct · pass mark {PASS_THRESHOLD}
        </p>
        {result.weakDomains.length > 0 && (
          <p className="mx-auto mt-3 max-w-md text-sm text-amber-700 dark:text-amber-300">
            {result.weakDomains.map((d) => DOMAIN_BY_ID[d].short).join(', ')} fell below 720. The
            exam scores you on the total only — but a weak domain drags that total down, so this is
            where the points are.
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Per-domain breakdown
        </h2>
        <div className="space-y-3">
          {result.domains
            .filter((d) => d.total > 0)
            .map((d) => (
              <div
                key={d.domain}
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <DomainBadge domain={d.domain} />
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {d.correct}/{d.total}
                    </span>
                  </div>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      d.passed
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {d.scaled} {d.passed ? '✓' : '✕'}
                  </span>
                </div>
                <ScoreBar
                  scaled={d.scaled ?? 0}
                  passed={d.passed}
                  colorClass={d.passed ? DOMAIN_STYLES[d.domain].bar : undefined}
                />
              </div>
            ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setReviewing((r) => !r)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {reviewing ? 'Hide answer review' : 'Review answers'}
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          New exam
        </button>
      </div>

      {reviewing && (
        <div className="space-y-8">
          {questions.map((q, i) => {
            const chosen = q.id in answers ? answers[q.id] : null;
            return (
              <div key={q.id} className="space-y-4">
                <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Question {i + 1}
                  {chosen === null && (
                    <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      unanswered
                    </span>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <QuestionCard
                    question={q}
                    seed={`review:${q.id}`}
                    selected={chosen}
                    onSelect={() => {}}
                    revealed
                  />
                </div>
                <Feedback correct={chosen === q.answer} question={q} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
