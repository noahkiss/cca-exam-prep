import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PRINCIPLES, ELIMINATION_RULES, GOTCHAS } from '@/data/reference';

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
