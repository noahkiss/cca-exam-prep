import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Domain, Question } from '@/types';
import { DOMAINS, DOMAIN_BY_ID, SCENARIO_SETS } from '@/types';
import { QUESTIONS, questionsByDomain } from '@/lib/questions';
import { PRINCIPLES, REFERENCE_BY_ID } from '@/data/reference';
import { seededPermutation } from '@/lib/rng';
import { recordAnswer, useStore } from '@/hooks/useStore';
import { QuestionCard } from '@/components/QuestionCard';
import { Feedback } from '@/components/Feedback';
import { HintPanel } from '@/components/HintPanel';

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
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);

  // A stable, shuffled run through the filtered bank for this session. A URL
  // targeted-drill filter takes precedence over the domain <select>.
  const pool = useMemo(() => {
    const base = urlFilter
      ? QUESTIONS.filter((q) => matchesFilter(q, urlFilter))
      : filter === 'all'
        ? QUESTIONS
        : questionsByDomain(filter);
    const seedKey = filterId ?? filter;
    const order = seededPermutation(base.length, `study:${seedKey}:${sessionSeed}`);
    return order.map((i) => base[i]);
  }, [filter, urlFilter, filterId, sessionSeed]);

  // Restart the run when the targeted-drill filter changes.
  useEffect(() => {
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setHintLevel(0);
  }, [filterId]);

  const question = pool[index];

  const resetForNext = () => {
    setSelected(null);
    setRevealed(false);
    setHintLevel(0);
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
    setIndex((i) => Math.min(pool.length - 1, i + 1));
  };

  const changeFilter = (f: Filter) => {
    setFilter(f);
    setIndex(0);
    resetForNext();
  };

  if (!question) {
    return (
      <p className="text-slate-600 dark:text-slate-400">
        No questions available for this filter yet.
      </p>
    );
  }

  const atEnd = index >= pool.length - 1;

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
              onChange={(e) => changeFilter(e.target.value as Filter)}
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

      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
        <span>
          Question {index + 1} of {pool.length}
        </span>
        {filter !== 'all' && <span>· {DOMAIN_BY_ID[filter].name}</span>}
      </div>

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
            <button
              type="button"
              onClick={submit}
              disabled={selected === null}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Check answer
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
          question={question}
        />
      )}
    </div>
  );
}
