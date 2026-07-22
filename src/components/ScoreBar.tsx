import { MAX_SCORE, MIN_SCORE, PASS_THRESHOLD } from '@/lib/scoring';

/** Horizontal 100–1000 bar with a marker at the 720 pass line. */
export function ScoreBar({
  scaled,
  passed,
  colorClass,
}: {
  scaled: number;
  passed: boolean;
  /** Optional fill colour; defaults to pass/fail semantics. */
  colorClass?: string;
}) {
  // The scale starts at MIN_SCORE, so the track spans MIN_SCORE..MAX_SCORE —
  // dividing by MAX_SCORE alone would draw a filled bar for a zero-correct paper.
  const span = MAX_SCORE - MIN_SCORE;
  const pct = Math.min(100, Math.max(0, ((scaled - MIN_SCORE) / span) * 100));
  const passPct = ((PASS_THRESHOLD - MIN_SCORE) / span) * 100;
  const fill = colorClass ?? (passed ? 'bg-emerald-500' : 'bg-rose-500');

  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div
        className={`h-full rounded-full transition-all ${fill}`}
        style={{ width: `${pct}%` }}
      />
      <div
        className="absolute top-0 h-full w-0.5 bg-slate-500 dark:bg-slate-400"
        style={{ left: `${passPct}%` }}
        title={`Pass line: ${PASS_THRESHOLD}`}
        aria-hidden
      />
    </div>
  );
}
