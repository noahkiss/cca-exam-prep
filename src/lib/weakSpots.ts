// Weak-spot / remediation analysis. Joins the per-question aggregate stats
// (accuracy) with the append-only attempt log (trend + recency) and the live
// question bank (to resolve each question's domain / principle / scenario set),
// then surfaces the areas most worth drilling next.
//
// Everything is derived at read time from ids in storage, so the analysis
// survives edits to the question bank — questions that no longer exist are just
// skipped rather than crashing or skewing a stale dimension.

import type { AppState } from '@/lib/storage';
import type { Domain } from '@/types';
import { DOMAIN_BY_ID, SCENARIO_SETS } from '@/types';
import { QUESTIONS_BY_ID } from '@/lib/questions';
import { REFERENCE_BY_ID } from '@/data/reference';
import { PASS_THRESHOLD, MAX_SCORE, toScaled } from '@/lib/scoring';

export type WeakAreaKind = 'domain' | 'principle' | 'scenarioSet';
export type WeakStatus = 'weak' | 'borderline' | 'ok';

export interface WeakArea {
  kind: WeakAreaKind;
  /** The dimension key: a domain id, principle/gotcha id, or scenario-set id. */
  key: string;
  /** Human label for display. */
  label: string;
  attempts: number;
  correct: number;
  /** Lifetime accuracy, 0–1. */
  accuracy: number;
  /** Accuracy on the 0–1000 exam scale. */
  scaled: number;
  status: WeakStatus;
  lastSeen: number;
  /** Rolling accuracy series (oldest→newest) for a sparkline. */
  trend: number[];
  /** Recent-minus-earlier accuracy, for an up/down indicator. */
  delta: number;
}

/** The 0–1 mastery bar (720/1000). */
export const MASTERY_BAR = PASS_THRESHOLD / MAX_SCORE;

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TREND_BUCKETS = 8;
const SCENARIO_SET_BY_ID = Object.fromEntries(SCENARIO_SETS.map((s) => [s.id, s]));

/** Resolve the dimension key for a question id, or null if it can't be mapped. */
function keyFor(kind: WeakAreaKind, id: string): string | null {
  const q = QUESTIONS_BY_ID[id];
  if (!q) return null;
  if (kind === 'domain') return q.domain;
  if (kind === 'principle') return q.principle;
  return q.scenarioSet ?? null;
}

function labelFor(kind: WeakAreaKind, key: string): string {
  if (kind === 'domain') return DOMAIN_BY_ID[key as Domain]?.name ?? key;
  if (kind === 'principle') return REFERENCE_BY_ID[key]?.title ?? key;
  return SCENARIO_SET_BY_ID[key]?.name ?? key;
}

/** Split a chronological correct/incorrect series into ≤8 rolling-window accuracies. */
function trendSeries(outcomes: boolean[]): number[] {
  const n = outcomes.length;
  if (n === 0) return [];
  const buckets = Math.min(MAX_TREND_BUCKETS, n);
  const series: number[] = [];
  for (let b = 0; b < buckets; b++) {
    const start = Math.floor((b * n) / buckets);
    const end = Math.floor(((b + 1) * n) / buckets);
    let correct = 0;
    for (let i = start; i < end; i++) if (outcomes[i]) correct++;
    series.push(end > start ? correct / (end - start) : 0);
  }
  return series;
}

function statusFor(scaled: number, attempts: number, correct: number): WeakStatus {
  const hasMiss = correct < attempts;
  if (attempts >= 3 && scaled < PASS_THRESHOLD) return 'weak';
  if ((scaled >= PASS_THRESHOLD && scaled <= 800) || (attempts < 3 && hasMiss)) {
    return 'borderline';
  }
  return 'ok';
}

/** Build the weak areas for a single dimension (domain | principle | scenarioSet). */
function areasForKind(kind: WeakAreaKind, state: AppState): WeakArea[] {
  // Aggregate accuracy + recency from per-question stats.
  const agg = new Map<string, { attempts: number; correct: number; lastSeen: number }>();
  for (const stat of Object.values(state.questionStats)) {
    const key = keyFor(kind, stat.id);
    if (key === null) continue;
    const bucket = agg.get(key) ?? { attempts: 0, correct: 0, lastSeen: 0 };
    bucket.attempts += stat.attempts;
    bucket.correct += stat.correct;
    bucket.lastSeen = Math.max(bucket.lastSeen, stat.lastSeen);
    agg.set(key, bucket);
  }

  // Chronological outcomes per key, from the append-only attempt log.
  const outcomes = new Map<string, boolean[]>();
  for (const a of state.attempts) {
    const key = keyFor(kind, a.id);
    if (key === null) continue;
    const arr = outcomes.get(key) ?? [];
    arr.push(a.correct);
    outcomes.set(key, arr);
  }

  const areas: WeakArea[] = [];
  for (const [key, bucket] of agg) {
    const accuracy = bucket.attempts > 0 ? bucket.correct / bucket.attempts : 0;
    const scaled = toScaled(bucket.correct, bucket.attempts);
    const trend = trendSeries(outcomes.get(key) ?? []);
    const delta = trend.length > 1 ? trend[trend.length - 1] - trend[0] : 0;
    areas.push({
      kind,
      key,
      label: labelFor(kind, key),
      attempts: bucket.attempts,
      correct: bucket.correct,
      accuracy,
      scaled,
      status: statusFor(scaled, bucket.attempts, bucket.correct),
      lastSeen: bucket.lastSeen,
      trend,
      delta,
    });
  }
  return areas;
}

/**
 * Full weak-spot analysis across all three dimensions. Returns every area with
 * at least one attempt, sorted by priority (most worth drilling first).
 */
export function analyzeWeakSpots(state: AppState, now = Date.now()): WeakArea[] {
  const all = [
    ...areasForKind('domain', state),
    ...areasForKind('principle', state),
    ...areasForKind('scenarioSet', state),
  ].filter((a) => a.attempts > 0);
  return all.sort((a, b) => priority(b, now) - priority(a, now));
}

/** Bias toward principle/domain lenses (the most directly actionable). */
function kindWeight(kind: WeakAreaKind): number {
  return kind === 'scenarioSet' ? 0.85 : 1;
}

/**
 * Ranking score: low accuracy hurts, more attempts and more recent practice
 * raise urgency. Recency decays on a ~1-week half-life but never to zero, so a
 * stubborn old weak spot still surfaces.
 */
function priority(a: WeakArea, now: number): number {
  const gap = 1 - a.accuracy;
  const attemptWeight = Math.log2(a.attempts + 1);
  const daysSince = a.lastSeen > 0 ? (now - a.lastSeen) / DAY_MS : 999;
  const recencyWeight = Math.max(0.3, Math.pow(0.5, daysSince / 7));
  return gap * attemptWeight * recencyWeight * kindWeight(a.kind);
}

/**
 * The n most important weak areas to drill: actionable (attempts ≥ 3, not yet
 * mastered), ranked by priority. Returns fewer than n — or none — when the user
 * hasn't practiced enough for any area to qualify.
 */
export function topWeakSpots(state: AppState, n: number, now = Date.now()): WeakArea[] {
  return analyzeWeakSpots(state, now)
    .filter((a) => a.attempts >= 3 && a.status !== 'ok')
    .slice(0, n);
}
