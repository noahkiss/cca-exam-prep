import { Link } from 'react-router-dom';
import { DOMAINS } from '@/types';
import { DOMAIN_STYLES } from '@/lib/domainStyles';
import { QUESTIONS } from '@/lib/questions';
import { PASS_THRESHOLD, MAX_SCORE } from '@/lib/scoring';
import { EXAM_SIZE } from '@/lib/sampling';
import { useStore } from '@/hooks/useStore';

const MODES = [
  {
    to: '/study',
    title: 'Study mode',
    blurb: 'One question at a time with progressive hints, full explanations, and per-question tips. No timer.',
    accent: 'from-indigo-500 to-violet-500',
  },
  {
    to: '/exam',
    title: 'Practice exam',
    blurb: `${EXAM_SIZE} questions, 120-minute timer, 4-of-6 scenario sampling, scored ${PASS_THRESHOLD}/${MAX_SCORE} to pass.`,
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    to: '/review',
    title: 'Review & spaced repetition',
    blurb: 'Re-drill only the questions you missed, scheduled with SM-2 so the tough ones resurface.',
    accent: 'from-amber-500 to-orange-500',
  },
  {
    to: '/reference',
    title: 'Get a step ahead',
    blurb: 'The meta-game: 5 exam-thinking principles, instant-elimination rules, and the gotchas that trip people up.',
    accent: 'from-rose-500 to-pink-500',
  },
];

export function HomePage() {
  const { exams } = useStore();
  const best = exams.reduce((m, e) => Math.max(m, e.scaled), 0);

  return (
    <div className="space-y-10">
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100">
          Drill for the CCA-F exam
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
          Scenario-based practice for the <strong>Claude Certified Architect – Foundations</strong>{' '}
          certification. Learn to think like the exam: given a broken agentic system and four
          plausible fixes, pick the one a good architect would actually choose.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {QUESTIONS.length} questions in the bank
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Pass at {PASS_THRESHOLD} / {MAX_SCORE}
          </span>
          {best > 0 && (
            <span className="rounded-full bg-indigo-100 px-3 py-1 font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
              Your best: {best}
            </span>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {MODES.map((m) => (
          <Link
            key={m.to}
            to={m.to}
            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${m.accent}`}
              aria-hidden
            />
            <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
              {m.title}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{m.blurb}</p>
          </Link>
        ))}
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
          The five domains
        </h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Weighted per the official blueprint. To pass you must clear the bar in{' '}
          <em>every</em> domain — a strong average can still hide one weak spot.
        </p>
        <div className="space-y-3">
          {DOMAINS.map((d) => (
            <div
              key={d.id}
              className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{d.name}</h3>
                <span className={`text-sm font-bold ${DOMAIN_STYLES[d.id].text}`}>
                  {d.weight}%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${DOMAIN_STYLES[d.id].bar}`}
                  style={{ width: `${d.weight}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{d.blurb}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
