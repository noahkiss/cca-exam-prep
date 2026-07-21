// Dashboard "Focus areas" panel: the handful of domains / principles / scenario
// sets most worth drilling next, each with a trend sparkline, a one-click
// targeted-drill link, and the authoritative docs to fix it.

import { Link } from 'react-router-dom';
import type { Domain, Resource } from '@/types';
import type { AppState } from '@/lib/storage';
import { topWeakSpots, type WeakArea } from '@/lib/weakSpots';
import { PASS_THRESHOLD } from '@/lib/scoring';
import { PRINCIPLES, GOTCHAS, DOMAIN_RESOURCES } from '@/data/reference';
import { ScoreBar } from '@/components/ScoreBar';
import { Sparkline } from '@/components/Sparkline';
import { ReferenceLink } from '@/components/ReferenceLink';

/** Reference entries that carry their own reading list, keyed by id. */
const REF_RESOURCES: Record<string, Resource[]> = Object.fromEntries(
  [...PRINCIPLES, ...GOTCHAS]
    .filter((e) => e.resources && e.resources.length > 0)
    .map((e) => [e.id, e.resources as Resource[]]),
);

const KIND_LABEL: Record<WeakArea['kind'], string> = {
  domain: 'Domain',
  principle: 'Principle',
  scenarioSet: 'Scenario set',
};

function resourcesFor(area: WeakArea): Resource[] {
  if (area.kind === 'domain') return DOMAIN_RESOURCES[area.key as Domain] ?? [];
  if (area.kind === 'principle') return REF_RESOURCES[area.key] ?? [];
  return [];
}

function drillHref(area: WeakArea): string {
  return `/study?${area.kind}=${encodeURIComponent(area.key)}`;
}

export function FocusAreas({ state }: { state: AppState }) {
  const areas = topWeakSpots(state, 5);

  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Focus areas</h2>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
        Where your accuracy is weakest right now — drill these first.
      </p>

      {areas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          Keep practicing to unlock focus areas. Once you have answered a few questions in an area,
          the weakest spots surface here with targeted drills.
        </div>
      ) : (
        <div className="space-y-3">
          {areas.map((area) => (
            <AreaCard key={`${area.kind}:${area.key}`} area={area} />
          ))}
        </div>
      )}
    </section>
  );
}

function AreaCard({ area }: { area: WeakArea }) {
  const passed = area.scaled >= PASS_THRESHOLD;
  const barColor = area.status === 'borderline' ? 'bg-amber-500' : undefined;
  const resources = resourcesFor(area);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {area.label}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {KIND_LABEL[area.kind]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkline
            data={area.trend}
            className={passed ? 'text-emerald-500' : 'text-rose-500'}
          />
          <DeltaBadge delta={area.delta} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <ScoreBar scaled={area.scaled} passed={passed} colorClass={barColor} />
        </div>
        <span
          className={`text-sm font-bold tabular-nums ${
            passed ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {area.scaled}
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {area.correct}/{area.attempts} correct
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link
          to={drillHref(area)}
          className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Drill these →
        </Link>
        {area.kind === 'principle' && <ReferenceLink id={area.key} />}
        {resources.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-700 dark:text-slate-400 dark:decoration-slate-600 dark:hover:text-slate-200"
          >
            {r.label}
            <span aria-hidden>↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}

/** Up/down accuracy trend indicator; flat when the change is small. */
function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0.05) {
    return (
      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400" title="Improving">
        ▲ {Math.round(delta * 100)}%
      </span>
    );
  }
  if (delta < -0.05) {
    return (
      <span className="text-xs font-medium text-rose-600 dark:text-rose-400" title="Declining">
        ▼ {Math.round(Math.abs(delta) * 100)}%
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-slate-400 dark:text-slate-500" title="Steady">
      —
    </span>
  );
}
