import { DOMAINS } from '@/types';
import { PASS_THRESHOLD, toScaled } from '@/lib/scoring';
import { questionsByDomain } from '@/lib/questions';
import { DOMAIN_STYLES } from '@/lib/domainStyles';
import { ScoreBar } from '@/components/ScoreBar';
import { DomainBadge } from '@/components/DomainBadge';
import { FocusAreas } from '@/components/FocusAreas';
import { useStore, clearAllProgress } from '@/hooks/useStore';

export function DashboardPage() {
  const state = useStore();

  // Per-domain mastery from lifetime question stats (scaled to the 0–1000 bar).
  const rows = DOMAINS.map((meta) => {
    const stats = Object.values(state.questionStats).filter((s) => s.domain === meta.id);
    const attempts = stats.reduce((n, s) => n + s.attempts, 0);
    const correct = stats.reduce((n, s) => n + s.correct, 0);
    const scaled = attempts > 0 ? toScaled(correct, attempts) : null;
    return {
      meta,
      attempts,
      correct,
      scaled,
      passed: scaled !== null && scaled >= PASS_THRESHOLD,
      coverage: stats.length,
      bankSize: questionsByDomain(meta.id).length,
    };
  });

  const attempted = rows.filter((r) => r.attempts > 0);
  const allAttempted = attempted.length === DOMAINS.length;
  const allPass = attempted.length > 0 && attempted.every((r) => r.passed);
  const verdict = !allAttempted
    ? 'incomplete'
    : allPass
      ? 'pass'
      : 'fail';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Domain mastery</h1>
        {Object.keys(state.questionStats).length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset all local progress? This cannot be undone.')) clearAllProgress();
            }}
            className="text-sm font-medium text-rose-600 underline underline-offset-2 hover:text-rose-500 dark:text-rose-400"
          >
            Reset progress
          </button>
        )}
      </div>

      <div
        className={`rounded-xl border p-5 ${
          verdict === 'pass'
            ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10'
            : verdict === 'fail'
              ? 'border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10'
              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
        }`}
      >
        <p className="text-sm text-slate-700 dark:text-slate-300">
          {verdict === 'pass' && (
            <>
              <strong className="text-emerald-700 dark:text-emerald-300">On track to pass.</strong>{' '}
              Every domain you have practiced is above the 720 bar. Keep them there.
            </>
          )}
          {verdict === 'fail' && (
            <>
              <strong className="text-rose-700 dark:text-rose-300">Not passing yet.</strong> At
              least one domain is below 720. Passing requires <em>every</em> domain above the bar,
              not just a strong average.
            </>
          )}
          {verdict === 'incomplete' && (
            <>Practice at least one question in every domain to see a pass/fail verdict.</>
          )}
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <div
            key={r.meta.id}
            className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <DomainBadge domain={r.meta.id} full />
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {r.meta.weight}% of exam
                </span>
              </div>
              {r.scaled !== null ? (
                <span
                  className={`text-sm font-bold tabular-nums ${
                    r.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {r.scaled} {r.passed ? '✓' : '✕'}
                </span>
              ) : (
                <span className="text-sm text-slate-400 dark:text-slate-500">no data</span>
              )}
            </div>
            <ScoreBar
              scaled={r.scaled ?? 0}
              passed={r.passed}
              colorClass={r.scaled === null ? 'bg-slate-300 dark:bg-slate-700' : r.passed ? DOMAIN_STYLES[r.meta.id].bar : undefined}
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {r.correct}/{r.attempts} correct · {r.coverage}/{r.bankSize} unique questions seen
            </p>
          </div>
        ))}
      </div>

      <FocusAreas state={state} />

      {state.exams.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Exam history
          </h2>
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-semibold">Date</th>
                  <th className="px-4 py-2 font-semibold">Score</th>
                  <th className="px-4 py-2 font-semibold">Correct</th>
                  <th className="px-4 py-2 font-semibold">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {state.exams.map((e) => (
                  <tr key={e.id} className="bg-white dark:bg-slate-900">
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      {new Date(e.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {e.scaled}
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      {e.correct}/{e.total}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          e.passedStrict
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {e.passedStrict ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
