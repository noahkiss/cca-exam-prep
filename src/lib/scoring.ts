// Deterministic scoring against the fixed answer key. Never LLM-judged.
//
// Scaled score formula (mirrors the real exam's 0–1000 scale, pass 720):
//   scaledScore = round( (correct / answered-or-total) * 1000 )
// For an exam attempt we divide by the number of questions PRESENTED (so an
// unanswered question counts as wrong — matching "no negative marking, but a
// blank still earns nothing"). Pass threshold is 720.
//
// Per-domain accuracy is a simple proportion within that domain; the pass
// verdict requires EVERY represented domain to clear 720 as well, not just the
// overall — an 85% average with one weak domain still fails.

import type { Domain, Question } from '@/types';
import { DOMAINS } from '@/types';

export const PASS_THRESHOLD = 720;
export const MAX_SCORE = 1000;

export interface DomainResult {
  domain: Domain;
  total: number;
  correct: number;
  /** 0–1000 scaled accuracy for this domain (or null if not represented). */
  scaled: number | null;
  passed: boolean;
}

export interface ScoreResult {
  total: number;
  answered: number;
  correct: number;
  /** Overall 0–1000 scaled score. */
  scaled: number;
  overallPassed: boolean;
  /** True only if overall AND every represented domain clear the bar. */
  passedStrict: boolean;
  domains: DomainResult[];
  /** Domains represented in this set that fell below the bar. */
  weakDomains: Domain[];
}

/** Scale a raw proportion (0–1) to the 0–1000 exam scale. */
export function toScaled(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * MAX_SCORE);
}

export interface GradedItem {
  question: Question;
  /** Canonical option index the user chose, or null if unanswered. */
  chosen: number | null;
}

export function gradeAttempt(items: GradedItem[]): ScoreResult {
  const total = items.length;
  let correct = 0;
  let answered = 0;

  const byDomain = new Map<Domain, { total: number; correct: number }>();
  for (const item of items) {
    if (item.chosen !== null) answered++;
    const isCorrect = item.chosen === item.question.answer;
    if (isCorrect) correct++;

    const d = item.question.domain;
    const bucket = byDomain.get(d) ?? { total: 0, correct: 0 };
    bucket.total++;
    if (isCorrect) bucket.correct++;
    byDomain.set(d, bucket);
  }

  const domains: DomainResult[] = DOMAINS.map((meta) => {
    const bucket = byDomain.get(meta.id);
    if (!bucket || bucket.total === 0) {
      return { domain: meta.id, total: 0, correct: 0, scaled: null, passed: true };
    }
    const scaled = toScaled(bucket.correct, bucket.total);
    return {
      domain: meta.id,
      total: bucket.total,
      correct: bucket.correct,
      scaled,
      passed: scaled >= PASS_THRESHOLD,
    };
  });

  const scaled = toScaled(correct, total);
  const overallPassed = scaled >= PASS_THRESHOLD;
  const represented = domains.filter((d) => d.total > 0);
  const weakDomains = represented.filter((d) => !d.passed).map((d) => d.domain);
  const passedStrict = overallPassed && weakDomains.length === 0;

  return {
    total,
    answered,
    correct,
    scaled,
    overallPassed,
    passedStrict,
    domains,
    weakDomains,
  };
}
