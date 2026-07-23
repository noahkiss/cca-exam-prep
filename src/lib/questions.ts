// Loads and validates the question bank. Content lives in data/questions.json
// (maintained separately) and is imported at build. A runtime guard drops
// malformed entries with a console warning rather than crashing the app.

import type { Domain, Question, ScenarioSet } from '@/types';
import { DOMAIN_BY_ID, EXAM_SCOPES, SCENARIO_SETS } from '@/types';
import rawQuestions from '../../data/questions.json';

const VALID_SCENARIO_SETS = new Set<string>(SCENARIO_SETS.map((s) => s.id));
const VALID_EXAM_SCOPES = new Set<string>(EXAM_SCOPES);

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
  if (
    o.examScope !== undefined &&
    !(typeof o.examScope === 'string' && VALID_EXAM_SCOPES.has(o.examScope))
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

/** True when a question covers a topic the official guide rules out of scope. */
export function isSupplementary(q: Question): boolean {
  return q.examScope === 'supplementary';
}

/**
 * Every validated, de-duplicated question, both scopes. Use this only where an
 * id must resolve regardless of scope (e.g. review of an already-answered
 * question); everything exam-facing should use `QUESTIONS`.
 */
export const ALL_QUESTIONS: Question[] = loadQuestions();

/**
 * The exam bank: blueprint-scoped questions only. This is the single choke
 * point that keeps supplementary content out of exam draws, scoring and
 * mastery — filter here rather than at each call site.
 */
export const QUESTIONS: Question[] = ALL_QUESTIONS.filter((q) => !isSupplementary(q));

/** Off-blueprint questions, surfaced only behind an explicit opt-in. */
export const SUPPLEMENTARY_QUESTIONS: Question[] = ALL_QUESTIONS.filter(isSupplementary);

/** Indexed over BOTH scopes so a stored attempt id always resolves. */
export const QUESTIONS_BY_ID: Record<string, Question> = Object.fromEntries(
  ALL_QUESTIONS.map((q) => [q.id, q]),
);

export function questionsByDomain(domain: Domain): Question[] {
  return QUESTIONS.filter((q) => q.domain === domain);
}

export function supplementaryByDomain(domain: Domain): Question[] {
  return SUPPLEMENTARY_QUESTIONS.filter((q) => q.domain === domain);
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
