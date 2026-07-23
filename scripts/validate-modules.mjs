#!/usr/bin/env node
/**
 * Content validation for data/modules.json.
 *
 * The loader in src/lib/modules.ts already drops a module whose steps are
 * ungradeable — this script is the build-time counterpart, so a bad module
 * fails here loudly instead of silently disappearing from the app.
 *
 * Checks:
 *   - ids unique across modules, step ids unique within a module
 *   - every quiz step points at a live question in the bank
 *   - every classify item lands in a declared bucket, and no bucket is empty
 *   - every order step's correctOrder (and each acceptableOrder) is a
 *     permutation of items, and `why` covers every item
 *   - every `principle` / `principles` id exists in src/data/reference.ts
 *   - blueprint modules never quiz a supplementary question
 *   - prerequisites resolve to real modules
 *
 * Exits non-zero on any error. Warnings are advisory and do not fail.
 */
import { readFileSync } from 'node:fs';

const modules = JSON.parse(readFileSync('data/modules.json', 'utf8'));
const questions = JSON.parse(readFileSync('data/questions.json', 'utf8'));

const QUESTION = new Map(questions.map((q) => [q.id, q]));
const PRINCIPLES = new Set(
  [...readFileSync('src/data/reference.ts', 'utf8').matchAll(/id: '([a-z0-9-]+)'/g)].map(
    (m) => m[1],
  ),
);

const errors = [];
const warnings = [];
const seenModuleIds = new Set();

const checkPrinciple = (id, where) => {
  if (id !== undefined && !PRINCIPLES.has(id)) {
    errors.push(`${where}: principle "${id}" is not in src/data/reference.ts`);
  }
};

for (const m of modules) {
  const at = `${m.id}`;
  if (seenModuleIds.has(m.id)) errors.push(`${at}: duplicate module id`);
  seenModuleIds.add(m.id);

  for (const p of m.principles ?? []) checkPrinciple(p, `${at}.principles`);
  if (!m.principles?.length) warnings.push(`${at}: no principles listed`);

  const seenStepIds = new Set();
  let graded = 0;

  for (const s of m.steps ?? []) {
    const sat = `${at}/${s.id}`;
    if (seenStepIds.has(s.id)) errors.push(`${sat}: duplicate step id`);
    seenStepIds.add(s.id);
    checkPrinciple(s.principle, sat);
    if (s.type !== 'teach') graded += 1;

    if (s.type === 'quiz') {
      const q = QUESTION.get(s.questionId);
      if (!q) {
        errors.push(`${sat}: quiz points at unknown question "${s.questionId}"`);
      } else if (q.examScope === 'supplementary' && m.examScope !== 'supplementary') {
        errors.push(
          `${sat}: blueprint module quizzes supplementary question "${s.questionId}"`,
        );
      }
    }

    if (s.type === 'classify') {
      const buckets = new Set((s.buckets ?? []).map((b) => b.id));
      const used = new Set();
      if (buckets.size < 2) errors.push(`${sat}: needs at least 2 buckets`);
      for (const it of s.items ?? []) {
        if (!buckets.has(it.bucket)) {
          errors.push(`${sat}: item "${it.id}" keyed to unknown bucket "${it.bucket}"`);
        }
        used.add(it.bucket);
        if (!it.why?.trim()) errors.push(`${sat}: item "${it.id}" has no why`);
      }
      for (const b of buckets) {
        if (!used.has(b)) errors.push(`${sat}: bucket "${b}" has no items`);
      }
    }

    if (s.type === 'order') {
      const ids = (s.items ?? []).map((i) => i.id);
      const isPermutation = (order) =>
        order.length === ids.length && new Set(order).size === ids.length &&
        order.every((id) => ids.includes(id));
      if (!isPermutation(s.correctOrder ?? [])) {
        errors.push(`${sat}: correctOrder is not a permutation of items`);
      }
      for (const [i, alt] of (s.acceptableOrders ?? []).entries()) {
        if (!isPermutation(alt)) {
          errors.push(`${sat}: acceptableOrders[${i}] is not a permutation of items`);
        }
        if (JSON.stringify(alt) === JSON.stringify(s.correctOrder)) {
          warnings.push(`${sat}: acceptableOrders[${i}] duplicates correctOrder`);
        }
      }
      for (const id of ids) {
        if (!s.why?.[id]?.trim()) errors.push(`${sat}: why is missing item "${id}"`);
      }
      for (const key of Object.keys(s.why ?? {})) {
        if (!ids.includes(key)) errors.push(`${sat}: why has stray key "${key}"`);
      }
    }
  }

  if (!graded) warnings.push(`${at}: no graded steps`);

  for (const p of m.prerequisites ?? []) {
    if (!modules.some((x) => x.id === p)) {
      errors.push(`${at}: prerequisite "${p}" is not a known module`);
    }
  }
}

const byDomain = {};
for (const m of modules) (byDomain[m.domain] ??= []).push(m);
for (const [d, ms] of Object.entries(byDomain)) {
  const orders = ms.map((m) => m.order);
  if (new Set(orders).size !== orders.length) {
    errors.push(`domain ${d}: duplicate module order values (${orders.join(', ')})`);
  }
}

const steps = modules.flatMap((m) => m.steps ?? []);
const quizIds = steps.filter((s) => s.type === 'quiz').map((s) => s.questionId);
const dupes = quizIds.filter((id, i) => quizIds.indexOf(id) !== i);
for (const id of new Set(dupes)) warnings.push(`question "${id}" is quizzed in more than one module`);

console.log(
  `modules: ${modules.length} | steps: ${steps.length} | quiz refs: ${quizIds.length}`,
);
console.log(
  `by domain: ${Object.entries(byDomain)
    .map(([d, ms]) => `${d} ${ms.length}`)
    .join(', ')}`,
);

for (const w of warnings) console.log(`WARN  ${w}`);
for (const e of errors) console.error(`ERROR ${e}`);

if (errors.length) {
  console.error(`\n${errors.length} error(s).`);
  process.exit(1);
}
console.log(`\nOK${warnings.length ? ` (${warnings.length} warning(s))` : ''}`);
