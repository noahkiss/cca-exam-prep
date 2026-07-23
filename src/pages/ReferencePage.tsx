import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PRINCIPLES, ELIMINATION_RULES, GOTCHAS } from '@/data/reference';
import { MODULES } from '@/lib/modules';

/**
 * Reverse index: reference entry id → the modules that teach it. A module claims
 * an entry through `principles[]` (module-level) or through any step's
 * `principle`; where a specific step matches, the link deep-links to that step.
 */
const TEACHING_MODULES: Record<string, { id: string; title: string; stepId?: string }[]> = {};
for (const m of MODULES) {
  const ids = new Set<string>(m.principles);
  for (const s of m.steps) if (s.principle) ids.add(s.principle);
  for (const pid of ids) {
    const step = m.steps.find((s) => s.principle === pid);
    (TEACHING_MODULES[pid] ??= []).push({ id: m.id, title: m.title, stepId: step?.id });
  }
}

/** "Modules that teach this" — the reverse of ReferenceLink. */
function TaughtBy({ id }: { id: string }) {
  const taught = TEACHING_MODULES[id];
  if (!taught || taught.length === 0) return null;
  return (
    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
      <span className="font-semibold">Modules that teach this:</span>{' '}
      {taught.map((t, i) => (
        <span key={t.id}>
          {i > 0 && ', '}
          <Link
            to={`/modules/${t.id}${t.stepId ? `#${t.stepId}` : ''}`}
            className="font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:decoration-indigo-500 dark:text-indigo-400 dark:decoration-indigo-500/50"
          >
            {t.title}
          </Link>
        </span>
      ))}
    </p>
  );
}

export function ReferencePage() {
  const { hash } = useLocation();

  // Deep-link support: scroll to the targeted entry after render.
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Get a step ahead
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
          The meta-game. Grinding questions teaches recall; these principles teach{' '}
          <em>judgment</em> — how the exam wants you to think when handed a broken system and four
          plausible fixes.
        </p>
      </header>

      <TocSection />

      <section>
        <h2 id="principles" className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
          The exam-thinking principles
        </h2>
        <div className="space-y-4">
          {PRINCIPLES.map((p) => (
            <article
              key={p.id}
              id={p.id}
              className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {p.title}
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {p.body}
              </p>
              <TaughtBy id={p.id} />
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 id="elimination" className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
          Instant-elimination rules
        </h2>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          An answer is almost certainly <strong>wrong</strong> if it…
        </p>
        <div className="space-y-3">
          {ELIMINATION_RULES.map((r) => (
            <article
              key={r.id}
              id={r.id}
              className="rounded-lg border-l-4 border-rose-400 bg-white p-4 dark:border-rose-500/60 dark:bg-slate-900"
            >
              <p className="font-medium text-slate-900 dark:text-slate-100">{r.text}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold">Why:</span> {r.why}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 id="gotchas" className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
          Gotchas &amp; tells
        </h2>
        <div className="space-y-4">
          {GOTCHAS.map((g) => (
            <article
              key={g.id}
              id={g.id}
              className="rounded-xl border border-amber-300/60 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/5"
            >
              <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {g.title}
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {g.body}
              </p>
              <TaughtBy id={g.id} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function TocSection() {
  const items = [
    { href: '#principles', label: 'Principles', count: PRINCIPLES.length },
    { href: '#elimination', label: 'Elimination rules', count: ELIMINATION_RULES.length },
    { href: '#gotchas', label: 'Gotchas & tells', count: GOTCHAS.length },
  ];
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((i) => (
        <a
          key={i.href}
          href={i.href}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {i.label} <span className="text-slate-400">({i.count})</span>
        </a>
      ))}
    </nav>
  );
}
