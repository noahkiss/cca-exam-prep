// Exam-mode question sampling. Mirrors the real exam's "4 of 6 scenario sets"
// structure: pick 4 of the 6 scenario sets, then draw questions from only those
// sets. Falls back gracefully when the bank is small or under-tagged.

import type { Question, ScenarioSet } from '@/types';
import { SCENARIO_SETS } from '@/types';
import { mulberry32, hashSeed } from './rng';

export const EXAM_SIZE = 60;
export const SETS_PER_EXAM = 4;

function shuffleInPlace<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Sample up to `min(EXAM_SIZE, bank size)` questions using 4-of-6 sampling.
 * `seed` makes the draw reproducible for a given attempt.
 */
export function sampleExam(all: Question[], seed: string): Question[] {
  const rand = mulberry32(hashSeed(seed));
  const target = Math.min(EXAM_SIZE, all.length);

  // Group by scenario set; untagged questions go in a shared pool.
  const bySet = new Map<ScenarioSet, Question[]>();
  const untagged: Question[] = [];
  for (const q of all) {
    if (q.scenarioSet) {
      const list = bySet.get(q.scenarioSet) ?? [];
      list.push(q);
      bySet.set(q.scenarioSet, list);
    } else {
      untagged.push(q);
    }
  }

  // Choose 4 of the 6 sets that actually have questions.
  const availableSets = SCENARIO_SETS.map((s) => s.id).filter(
    (id) => (bySet.get(id)?.length ?? 0) > 0,
  );
  const chosenSets = shuffleInPlace([...availableSets], rand).slice(0, SETS_PER_EXAM);

  // Pool = questions from the chosen sets, plus untagged as filler.
  const pool: Question[] = [];
  for (const id of chosenSets) pool.push(...(bySet.get(id) ?? []));
  pool.push(...untagged);

  // If the chosen sets don't yield enough, backfill from the rest of the bank.
  if (pool.length < target) {
    const chosenIds = new Set(pool.map((q) => q.id));
    const rest = all.filter((q) => !chosenIds.has(q.id));
    pool.push(...rest);
  }

  return shuffleInPlace(pool, rand).slice(0, target);
}
