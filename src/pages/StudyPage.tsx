import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Domain, Question } from '@/types';
import { DOMAINS, DOMAIN_BY_ID, SCENARIO_SETS } from '@/types';
import {
  QUESTIONS,
  SUPPLEMENTARY_QUESTIONS,
  questionsByDomain,
  supplementaryByDomain,
} from '@/lib/questions';
import { PRINCIPLES, REFERENCE_BY_ID } from '@/data/reference';
import { seededPermutation } from '@/lib/rng';
import { recordAnswer, useStore } from '@/hooks/useStore';
import { QuestionCard } from '@/components/QuestionCard';
import { Feedback } from '@/components/Feedback';
import { HintPanel } from '@/components/HintPanel';
import { SUPPLEMENTARY_NOTE } from '@/components/ScopeBadge';

const PRINCIPLE_BY_ID = Object.fromEntries(PRINCIPLES.map((p) => [p.id, p]));
const SCENARIO_SET_BY_ID = Object.fromEntries(SCENARIO_SETS.map((s) => [s.id, s]));

type Filter = Domain | 'all';

/** A targeted-drill filter parsed from the URL (?domain= | ?principle= | ?scenarioSet=). */
interface StudyFilter {
  kind: 'domain' | 'principle' | 'scenarioSet';
  key: string;
  label: string;
}

function parseStudyFilter(params: URLSearchParams): StudyFilter | null {
  const domain = params.get('domain');
  if (domain && domain in DOMAIN_BY_ID) {
    return { kind: 'domain', key: domain, label: DOMAIN_BY_ID[domain as Domain].name };
  }
  const principle = params.get('principle');
  if (principle && REFERENCE_BY_ID[principle]) {
    return { kind: 'principle', key: principle, label: REFERENCE_BY_ID[principle].title };
  }
  const scenarioSet = params.get('scenarioSet');
  if (scenarioSet && SCENARIO_SET_BY_ID[scenarioSet]) {
    return { kind: 'scenarioSet', key: scenarioSet, label: SCENARIO_SET_BY_ID[scenarioSet].name };
  }
  return null;
}

function matchesFilter(q: Question, f: StudyFilter): boolean {
  if (f.kind === 'domain') return q.domain === f.key;
  if (f.kind === 'principle') return q.principle === f.key;
  return q.scenarioSet === f.key;
}

export function StudyPage() {
  // Reactively include newly seen counts, and keep the store subscription warm.
  useStore();

  const [searchParams] = useSearchParams();
  const urlFilter = useMemo(() => parseStudyFilter(searchParams), [searchParams]);
  const filterId = urlFilter ? `${urlFilter.kind}:${urlFilter.key}` : null;

  const [filter, setFilter] = useState<Filter>('all');
  const [sessionSeed] = useState(() => Date.now().toString(36));

  // The run's identity. One key both seeds the shuffle and mounts StudyRun, so
  // changing either filter reshuffles and restarts the run together — the
  // restart is a remount, not four state resets reconciled after the fact.
  const runKey = filterId ?? filter;

  // A stable, shuffled run through the filtered bank for this session. A URL
  // targeted-drill filter takes precedence over the domain <select>.
  const pool = useMemo(() => {
    const select = (scoped: Question[], byDomain: (d: Domain) => Question[]) =>
      urlFilter
        ? scoped.filter((q) => matchesFilter(q, urlFilter))
        : filter === 'all'
          ? scoped
          : byDomain(filter);
    const seedKey = runKey;
    const shuffle = (list: Question[], salt: string) =>
      seededPermutation(list.length, `study:${salt}:${seedKey}:${sessionSeed}`).map((i) => list[i]);

    const base = shuffle(select(QUESTIONS, questionsByDomain), 'blueprint');
    // The handful of off-blueprint questions are always appended, badged, after
    // the exam-relevant run — too few to be worth a toggle, and kept distinct
    // from the faithful drill by ordering rather than by opt-in.
    return [...base, ...shuffle(select(SUPPLEMENTARY_QUESTIONS, supplementaryByDomain), 'supp')];
  }, [filter, urlFilter, runKey, sessionSeed]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Study mode</h1>
        {!urlFilter && (
          <div className="flex items-center gap-2">
            <label htmlFor="domain-filter" className="text-sm text-slate-600 dark:text-slate-400">
              Domain
            </label>
            <select
              id="domain-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="all">All domains</option>
              {DOMAINS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.short}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {urlFilter && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm dark:border-indigo-500/30 dark:bg-indigo-500/10">
          <span className="text-slate-700 dark:text-slate-300">
            Focusing on:{' '}
            <strong className="text-slate-900 dark:text-slate-100">{urlFilter.label}</strong>
          </span>
          <Link
            to="/study"
            className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-400"
          >
            Clear filter
          </Link>
        </div>
      )}

      <StudyRun
        key={runKey}
        pool={pool}
        sessionSeed={sessionSeed}
        domainLabel={filter === 'all' ? null : DOMAIN_BY_ID[filter].name}
      />
    </div>
  );
}

/**
 * One pass through a filtered bank. Mounted under a key derived from the active
 * filter, so changing filter restarts the run by remount — the cursor, the
 * selection, the reveal and the hint level all start fresh because they are new
 * state, not because an effect reset them after the fact.
 */
function StudyRun({
  pool,
  sessionSeed,
  domainLabel,
}: {
  pool: Question[];
  sessionSeed: string;
  domainLabel: string | null;
}) {
  // The run walks a round at a time. The first round is the shuffled pool;
  // skipping sets a question aside into `pending` rather than re-appending it
  // inline, and at the end of a round the pending skips become the next round.
  // All re-init on remount (the parent keys StudyRun by filter), so a filter
  // change starts fresh.
  const [queue, setQueue] = useState<Question[]>(() => pool);
  const [pending, setPending] = useState<Question[]>([]);
  const [round, setRound] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);

  // Clamp during render so the cursor stays valid without a correcting effect.
  const index = Math.min(cursor, Math.max(0, queue.length - 1));
  const question = queue[index];
  const atEnd = index >= queue.length - 1;

  const resetForNext = () => {
    setSelected(null);
    setRevealed(false);
    setHintLevel(0);
  };

  // Roll the collected skips into a fresh round.
  const startRound = (items: Question[]) => {
    setQueue(items);
    setPending([]);
    setRound((r) => r + 1);
    setCursor(0);
    resetForNext();
  };

  const submit = () => {
    if (selected === null || !question) return;
    setRevealed(true);
    recordAnswer({
      id: question.id,
      domain: question.domain,
      correct: selected === question.answer,
      usedHint: hintLevel > 0,
      mode: 'study',
    });
  };

  const next = () => {
    resetForNext();
    setCursor(Math.min(queue.length - 1, index + 1));
  };

  const skip = () => {
    if (!question) return;
    const collected = [...pending, question];
    // Skipping the last of a round has nowhere further to go, so roll straight
    // into the revisit round; otherwise just set it aside and advance.
    if (atEnd) {
      startRound(collected);
    } else {
      setPending(collected);
      resetForNext();
      setCursor(index + 1);
    }
  };

  if (!question) {
    return (
      <p className="text-slate-600 dark:text-slate-400">
        No questions available for this filter yet.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <span>
          Question {index + 1} of {queue.length}
        </span>
        {domainLabel && <span>· {domainLabel}</span>}
        {pending.length > 0 && (
          <span className="text-amber-600 dark:text-amber-400">
            · {pending.length} skipped to revisit
          </span>
        )}
      </div>

      {round > 0 && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-900 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
          Revisiting skipped questions.
        </div>
      )}

      {question.examScope === 'supplementary' && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          {SUPPLEMENTARY_NOTE}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <QuestionCard
          question={question}
          seed={sessionSeed}
          selected={selected}
          onSelect={setSelected}
          revealed={revealed}
        />

        {!revealed && (
          <HintPanel
            level={hintLevel}
            hint={question.hint}
            principle={PRINCIPLE_BY_ID[question.principle]}
            eliminationRule={question.eliminationRule}
            onReveal={() => setHintLevel((l) => l + 1)}
          />
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {hintLevel > 0 && !revealed && `${hintLevel} hint${hintLevel > 1 ? 's' : ''} used`}
          </span>
          {!revealed ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={skip}
                disabled={pool.length <= 1}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={selected === null}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Check answer
              </button>
            </div>
          ) : atEnd && pending.length > 0 ? (
            <button
              type="button"
              onClick={() => startRound(pending)}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Revisit {pending.length} skipped →
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={atEnd}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {atEnd ? 'End of set' : 'Next question →'}
            </button>
          )}
        </div>
      </div>

      {revealed && (
        <Feedback
          correct={selected === question.answer}
          explanation={question.explanation}
          tip={question.tip}
          principle={question.principle}
          eliminationRule={question.eliminationRule}
        />
      )}
    </>
  );
}
