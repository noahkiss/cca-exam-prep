// Deterministic scoring against the fixed answer key. Never LLM-judged.
//
// Scaled score formula (mirrors the real exam's 100–1000 scale, pass 720):
//   scaledScore = 100 + round( (correct / answered-or-total) * 900 )
// The real scale has a FLOOR of 100, not 0 — a zero-correct paper still reports
// 100. So 720 corresponds to ~68.9% raw, not 72%.
// For an exam attempt we divide by the number of questions PRESENTED (so an
// unanswered question counts as wrong — matching "a blank still earns nothing").
//
// Per-domain accuracy is a simple proportion within that domain. It is a STUDY
// DIAGNOSTIC, not an exam rule: the real exam's pass/fail verdict is the total
// scaled score alone, and section percentages do not gate it. A weak domain
// still sinks you, but by arithmetic — it drags the total down.

import type { Domain, Question } from '@/types';
import { DOMAINS } from '@/types';

export const PASS_THRESHOLD = 720;
export const MAX_SCORE = 1000;
/** Floor of the reported scale — 0% correct still reports 100, not 0. */
export const MIN_SCORE = 100;

export interface DomainResult {
  domain: Domain;
  total: number;
  correct: number;
  /** 100–1000 scaled accuracy for this domain (or null if not represented). */
  scaled: number | null;
  /** Diagnostic only — the real exam does not gate on section scores. */
  passed: boolean;
}

export interface ScoreResult {
  total: number;
  answered: number;
  correct: number;
  /** Overall 100–1000 scaled score. */
  scaled: number;
  /** THE verdict — the exam passes or fails on the total scaled score alone. */
  overallPassed: boolean;
  /**
   * Stricter study-mode view: overall AND every represented domain clear 720.
   * NOT an exam rule — use it to decide what to drill, never to predict a result.
   */
  passedStrict: boolean;
  domains: DomainResult[];
  /** Domains represented in this set that fell below the bar. */
  weakDomains: Domain[];
}

/** Scale a raw proportion (0–1) onto the 100–1000 exam scale. */
export function toScaled(correct: number, total: number): number {
  if (total <= 0) return MIN_SCORE;
  return MIN_SCORE + Math.round((correct / total) * (MAX_SCORE - MIN_SCORE));
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
