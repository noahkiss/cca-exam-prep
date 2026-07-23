// A single learning module, one step at a time.
//
// This page owns everything around a step — resume, navigation, progress and
// persistence. The step body itself is StepView's job; it renders and grades,
// then hands the outcome back through `onGraded` and this page decides what to
// write down. Steps are freely navigable: nothing is locked behind the previous
// step, so a candidate can jump straight to the part they came for.

import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import type { LearningModule, ModuleStep } from '@/types';
import { DOMAIN_BY_ID } from '@/types';
import { MODULE_BY_ID, gradedSteps } from '@/lib/modules';
import { QUESTIONS_BY_ID } from '@/lib/questions';
import { DOMAIN_STYLES } from '@/lib/domainStyles';
import { recordAnswer, recordStep, useStore } from '@/hooks/useStore';
import { DomainBadge } from '@/components/DomainBadge';
import { ScopeBadge, SUPPLEMENTARY_NOTE } from '@/components/ScopeBadge';
import { StepView, type StepOutcome } from '@/components/module/StepView';

export function ModulePage() {
  const { id = '' } = useParams();
  const mod = MODULE_BY_ID[id];
  if (!mod) return <NotFound id={id} />;
  // Keyed so switching modules remounts the runner: resume state is computed
  // once at mount rather than reconciled through effects.
  return <ModuleRunner key={mod.id} module={mod} />;
}

function ModuleRunner({ module: m }: { module: LearningModule }) {
  const { hash } = useLocation();
  const { modules } = useStore();
  const progress = modules[m.id];

  // Entry point: an explicit #<stepId> deep link wins, otherwise resume where
  // the last session left off, otherwise start at the top.
  const [index, setIndex] = useState(() => {
    const target = hash ? hash.slice(1) : progress?.lastStepId;
    const i = target ? m.steps.findIndex((s) => s.id === target) : -1;
    return i >= 0 ? i : 0;
  });

  // A hash arriving while the page is already mounted (a reference deep link
  // into the module you're reading) still moves the cursor.
  useEffect(() => {
    if (!hash) return;
    const i = m.steps.findIndex((s) => s.id === hash.slice(1));
    if (i >= 0) setIndex(i);
  }, [hash, m]);

  const step = m.steps[index];
  const recorded = progress?.steps[step.id];

  // Exposition reports `correct: null` when the reader acknowledges it, which
  // keeps it out of the attempt log and out of mastery math while still
  // counting toward finishing the module. That acknowledgement is StepView's to
  // emit, so nothing here marks a teach step read on the reader's behalf.
  const onGraded = useCallback(
    (outcome: StepOutcome) => {
      recordStep({
        moduleId: m.id,
        stepId: step.id,
        correct: outcome.correct,
        usedHint: outcome.usedHint,
      });
      // A quiz step is a real bank question, so it also lands in questionStats,
      // the missed list and SM-2 under its own id. recordStep already skips its
      // own attempt-log entry for quiz steps, so the domain isn't double-counted.
      if (step.type === 'quiz' && outcome.correct !== null) {
        const q = QUESTIONS_BY_ID[step.questionId];
        if (q) {
          recordAnswer({
            id: q.id,
            domain: q.domain,
            correct: outcome.correct,
            usedHint: outcome.usedHint,
            mode: 'module',
          });
        }
      }
    },
    [m.id, step],
  );

  const done = m.steps.filter((s) => progress?.steps[s.id]).length;
  const atStart = index === 0;
  const atEnd = index === m.steps.length - 1;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/modules"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          ← All modules
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{m.title}</h1>
          <DomainBadge domain={m.domain} />
          <ScopeBadge scope={m.examScope} />
        </div>
        <p className="mt-1.5 text-slate-600 dark:text-slate-400">{m.outcome}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {DOMAIN_BY_ID[m.domain].name} · ~{m.estimatedMinutes} min
        </p>
      </div>

      {m.examScope === 'supplementary' && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          {SUPPLEMENTARY_NOTE}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>
            Step {index + 1} of {m.steps.length}
          </span>
          <span>
            {done} of {m.steps.length} done
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${DOMAIN_STYLES[m.domain].bar}`}
            style={{ width: `${Math.round((done / m.steps.length) * 100)}%` }}
          />
        </div>
        <StepRail
          steps={m.steps}
          index={index}
          progress={progress?.steps}
          onSelect={setIndex}
        />
      </div>

      {/* Phone only. A step runs several screens tall, and the only way onward
          used to be the row at the very bottom of the card — so step position
          and prev/next ride along at the top of the viewport instead. The step's
          own submit pins to the *bottom* on the same breakpoint (STEP_ACTION_ROW);
          keeping these two at opposite edges is what stops them colliding. */}
      <div className="sticky top-14 z-10 -mx-4 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/95 px-4 py-2 backdrop-blur sm:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Step {index + 1} of {m.steps.length}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={atStart}
            aria-label="Previous step"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(m.steps.length - 1, i + 1))}
            disabled={atEnd}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <StepView module={m} step={step} recorded={recorded} onGraded={onGraded} />

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={atStart}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(m.steps.length - 1, i + 1))}
            disabled={atEnd}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {atEnd ? 'Last step' : 'Next step →'}
          </button>
        </div>
      </div>

      {progress?.completedAt !== undefined && <Completion module={m} progress={progress.steps} />}
    </div>
  );
}

/** Jump-to-step rail. Colour encodes the recorded outcome, not the position. */
function StepRail({
  steps,
  index,
  progress,
  onSelect,
}: {
  steps: ModuleStep[];
  index: number;
  progress?: Record<string, { correct: boolean | null }>;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {steps.map((s, i) => {
        const outcome = progress?.[s.id]?.correct;
        const tone =
          outcome === true
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
            : outcome === false
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300'
              : progress?.[s.id]
                ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(i)}
            title={s.title}
            aria-current={i === index ? 'step' : undefined}
            className={`h-7 w-7 rounded-md text-xs font-semibold transition-colors ${tone} ${
              i === index ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-950' : ''
            }`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}

function Completion({
  module: m,
  progress,
}: {
  module: LearningModule;
  progress: Record<string, { correct: boolean | null }>;
}) {
  const graded = gradedSteps(m);
  const correct = graded.filter((s) => progress[s.id]?.correct === true).length;

  return (
    <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-500/40 dark:bg-emerald-500/10">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Module complete</h2>
      <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300">
        You worked all {m.steps.length} steps and got{' '}
        <strong>
          {correct} of {graded.length}
        </strong>{' '}
        graded exercises right. Module results feed your study diagnostics only — they never affect
        a practice-exam score.
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
        <Link
          to={`/study?domain=${m.domain}`}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
        >
          Drill {DOMAIN_BY_ID[m.domain].short} questions
        </Link>
        <Link
          to="/modules"
          className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Back to modules
        </Link>
      </div>
    </section>
  );
}

function NotFound({ id }: { id: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Module not found</h1>
      <p className="text-slate-600 dark:text-slate-400">
        No learning module with the id <code className="font-mono">{id}</code>.
      </p>
      <Link
        to="/modules"
        className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        Browse all modules
      </Link>
    </div>
  );
}
