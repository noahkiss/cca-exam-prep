// Loads and validates the question bank. Content lives in data/questions.json
// (maintained separately) and is imported at build. A runtime guard drops
// malformed entries with a console warning rather than crashing the app.

import type { Domain, Question, ScenarioSet } from '@/types';
import { DOMAIN_BY_ID, SCENARIO_SETS } from '@/types';
import rawQuestions from '../../data/questions.json';

const VALID_SCENARIO_SETS = new Set<string>(SCENARIO_SETS.map((s) => s.id));

function isValidQuestion(q: unknown): q is Question {
  if (typeof q !== 'object' || q === null) return false;
  const o = q as Record<string, unknown>;
  const stringFields = [
    'id',
    'scenario',
    'question',
    'hint',
    'explanation',
    'eliminationRule',
    'tip',
    'principle',
  ] as const;
  for (const f of stringFields) {
    if (typeof o[f] !== 'string' || (o[f] as string).length === 0) return false;
  }
  if (typeof o.domain !== 'string' || !(o.domain in DOMAIN_BY_ID)) return false;
  if (
    o.scenarioSet !== undefined &&
    !(typeof o.scenarioSet === 'string' && VALID_SCENARIO_SETS.has(o.scenarioSet))
  ) {
    return false;
  }
  if (!Array.isArray(o.options) || o.options.length < 2) return false;
  if (!o.options.every((opt) => typeof opt === 'string' && opt.length > 0)) return false;
  if (
    typeof o.answer !== 'number' ||
    !Number.isInteger(o.answer) ||
    o.answer < 0 ||
    o.answer >= o.options.length
  ) {
    return false;
  }
  return true;
}

function loadQuestions(): Question[] {
  const arr = Array.isArray(rawQuestions) ? rawQuestions : [];
  const valid: Question[] = [];
  const seen = new Set<string>();
  for (const q of arr) {
    if (!isValidQuestion(q)) {
      // eslint-disable-next-line no-console
      console.warn('[questions] skipping malformed entry', q);
      continue;
    }
    if (seen.has(q.id)) {
      // eslint-disable-next-line no-console
      console.warn('[questions] skipping duplicate id', q.id);
      continue;
    }
    seen.add(q.id);
    valid.push(q as Question);
  }
  return valid;
}

/** The validated, de-duplicated question bank. */
export const QUESTIONS: Question[] = loadQuestions();

export const QUESTIONS_BY_ID: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q]),
);

export function questionsByDomain(domain: Domain): Question[] {
  return QUESTIONS.filter((q) => q.domain === domain);
}

/** Count of questions available per scenario set (for exam sampling UI). */
export function scenarioSetCounts(): Record<ScenarioSet, number> {
  const counts = {} as Record<ScenarioSet, number>;
  for (const s of SCENARIO_SETS) counts[s.id] = 0;
  for (const q of QUESTIONS) {
    if (q.scenarioSet) counts[q.scenarioSet]++;
  }
  return counts;
}
