// The learning-module track list. Modules are grouped by domain and ordered
// within a domain by their track position. Prerequisites are advisory only —
// they are rendered as a "best after" hint and never gate a module, because a
// candidate revising one weak area should be able to jump straight to it.

import { Link } from 'react-router-dom';
import type { LearningModule } from '@/types';
import { DOMAINS } from '@/types';
import { MODULES, MODULE_BY_ID, modulesByDomain } from '@/lib/modules';
import { DOMAIN_STYLES } from '@/lib/domainStyles';
import type { ModuleProgress } from '@/lib/storage';
import { useStore } from '@/hooks/useStore';
import { DomainBadge } from '@/components/DomainBadge';
import { ScopeBadge } from '@/components/ScopeBadge';

export function ModulesPage() {
  const { modules } = useStore();

  const totalSteps = MODULES.reduce((n, m) => n + m.steps.length, 0);
  const completed = MODULES.filter((m) => modules[m.id]?.completedAt !== undefined).length;

  if (MODULES.length === 0) {
    return <p className="text-slate-600 dark:text-slate-400">No learning modules available yet.</p>;
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Learning modules
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
          Guided tracks that build the judgment the exam tests: read the idea, sort the cases,
          sequence the pipeline, then answer a real bank question on it. Work a track end to end,
          or drop into the one module covering your weakest area.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {MODULES.length} modules · {totalSteps} steps
          </span>
          {completed > 0 && (
            <span className="rounded-full bg-indigo-100 px-3 py-1 font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
              {completed} completed
            </span>
          )}
        </div>
      </header>

      {DOMAINS.map((d) => {
        const list = modulesByDomain(d.id);
        if (list.length === 0) return null;
        return (
          <section key={d.id}>
            <div className="mb-1 flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{d.name}</h2>
              <DomainBadge domain={d.id} />
              <span className={`text-sm font-bold ${DOMAIN_STYLES[d.id].text}`}>
                {d.weight}% of the exam
              </span>
            </div>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{d.blurb}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {list.map((m) => (
                <ModuleCard key={m.id} module={m} progress={modules[m.id]} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ModuleCard({ module: m, progress }: { module: LearningModule; progress?: ModuleProgress }) {
  const total = m.steps.length;
  const done = m.steps.filter((s) => progress?.steps[s.id]).length;
  const isComplete = progress?.completedAt !== undefined;
  const status = isComplete ? 'Completed' : done > 0 ? `${done} of ${total} steps` : 'Not started';
  // Prerequisite titles, skipping any id that no longer resolves to a module.
  const prereqs = (m.prerequisites ?? [])
    .map((id) => MODULE_BY_ID[id])
    .filter((p): p is LearningModule => Boolean(p));

  return (
    <Link
      to={`/modules/${m.id}`}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
          {m.title}
        </h3>
        <div className="flex items-center gap-2">
          <ScopeBadge scope={m.examScope} />
          {m.kind === 'capstone' && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Capstone
            </span>
          )}
        </div>
      </div>

      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{m.outcome}</p>

      <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-400">
        {m.objectives.map((o) => (
          <li key={o} className="flex gap-2">
            <span aria-hidden className="text-slate-400 dark:text-slate-600">
              ·
            </span>
            <span>{o}</span>
          </li>
        ))}
      </ul>

      {prereqs.length > 0 && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Best after {prereqs.map((p) => p.title).join(', ')} — not required.
        </p>
      )}

      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            {total} steps · ~{m.estimatedMinutes} min
          </span>
          <span
            className={
              isComplete
                ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
            }
          >
            {status}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${DOMAIN_STYLES[m.domain].bar}`}
            style={{ width: `${Math.round((done / total) * 100)}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
