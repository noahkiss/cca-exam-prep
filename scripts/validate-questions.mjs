#!/usr/bin/env node
// Validates data/questions.json against the CCA-F Question schema (src/types.ts)
// and the reference id set (src/data/reference.ts). Plain Node ESM, no deps.
//
//   node scripts/validate-questions.mjs
//
// Exit codes: 0 = all hard checks pass, 1 = one or more hard failures.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const QUESTIONS_PATH = join(ROOT, 'data', 'questions.json');
const REFERENCE_PATH = join(ROOT, 'src', 'data', 'reference.ts');

// ---- Constants from the schema (src/types.ts) ----
const DOMAINS = ['arch', 'cc', 'pe', 'mcp', 'ctx'];
const SCENARIO_SETS = [
  'support-agent',
  'code-gen',
  'multi-agent-research',
  'dev-productivity',
  'ci',
  'data-extraction',
];
const REQUIRED_STRING_FIELDS = [
  'id',
  'domain',
  'scenario',
  'question',
  'hint',
  'explanation',
  'eliminationRule',
  'tip',
  'principle',
];
// Optional provenance tag on imported (MIT) questions. Originals omit it.
const ALLOWED_SOURCES = ['connectry-mit', 'neerajkr7-mit', 'original'];

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

// ---- Load reference ids (PRINCIPLES + GOTCHAS ids) by parsing id: lines ----
// The reference file only cross-links questions via Principle and Gotcha ids
// (REFERENCE_BY_ID), so we collect every `id: '...'` occurrence. This is a
// superset (also includes elimination-rule ids), which is safe for a
// membership check — a false "valid" only happens if a question points at an
// elimination-rule id, which we additionally flag as a soft warning below.
function loadReferenceIds() {
  const src = readFileSync(REFERENCE_PATH, 'utf8');
  const ids = new Set();
  const re = /\bid:\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(src)) !== null) ids.add(m[1]);
  return ids;
}

let referenceIds;
try {
  referenceIds = loadReferenceIds();
} catch (e) {
  fail(`Could not read/parse ${REFERENCE_PATH}: ${e.message}`);
  referenceIds = new Set();
}
if (referenceIds.size === 0) fail('Parsed zero reference ids — regex/format problem.');

// Elimination-rule ids (id starts with "elim-") are NOT valid `principle`
// targets — questions must link to a Principle or Gotcha.
const elimIds = new Set([...referenceIds].filter((id) => id.startsWith('elim-')));

// ---- Load questions ----
let questions;
try {
  questions = JSON.parse(readFileSync(QUESTIONS_PATH, 'utf8'));
} catch (e) {
  fail(`Could not read/parse ${QUESTIONS_PATH}: ${e.message}`);
}

if (!Array.isArray(questions)) {
  fail('questions.json is not a JSON array.');
  report();
  process.exit(errors.length ? 1 : 0);
}

// ---- Per-question checks ----
const seenIds = new Set();
const domainCounts = Object.fromEntries(DOMAINS.map((d) => [d, 0]));
const answerCounts = [0, 0, 0, 0];
const sourceCounts = {};
let longestCorrect = 0;
let shortestCorrect = 0;

/** Hosts a question `references` entry may point at — official docs only. */
// Canonical documentation hosts. `docs.anthropic.com` is deliberately NOT here: it is a
// three-hop redirect into platform.claude.com, so a citation using it returns 200 while
// silently pointing somewhere else. Nothing in the bank uses it; keep it that way.
const REFERENCE_HOSTS = new Set([
  'platform.claude.com',
  'code.claude.com',
  'modelcontextprotocol.io',
  'www.anthropic.com',
  'anthropic.com',
]);

for (let i = 0; i < questions.length; i++) {
  const q = questions[i];
  const label = q && q.id ? `#${i} (${q.id})` : `#${i}`;

  if (typeof q !== 'object' || q === null) {
    fail(`${label}: not an object.`);
    continue;
  }

  for (const f of REQUIRED_STRING_FIELDS) {
    if (typeof q[f] !== 'string' || q[f].trim() === '') {
      fail(`${label}: field "${f}" must be a non-empty string.`);
    }
  }

  // id uniqueness
  if (typeof q.id === 'string') {
    if (seenIds.has(q.id)) fail(`${label}: duplicate id "${q.id}".`);
    seenIds.add(q.id);
  }

  // domain
  if (DOMAINS.includes(q.domain)) domainCounts[q.domain]++;
  else fail(`${label}: domain "${q.domain}" is not one of ${DOMAINS.join(', ')}.`);

  // scenarioSet (optional)
  if (q.scenarioSet !== undefined && !SCENARIO_SETS.includes(q.scenarioSet)) {
    fail(`${label}: scenarioSet "${q.scenarioSet}" is not one of the six codes.`);
  }

  // source (optional) — provenance tag on imported questions
  if (q.source !== undefined) {
    if (typeof q.source !== 'string' || !ALLOWED_SOURCES.includes(q.source)) {
      fail(`${label}: source "${q.source}" is not one of ${ALLOWED_SOURCES.join(', ')}.`);
    }
    sourceCounts[q.source] = (sourceCounts[q.source] || 0) + 1;
  } else {
    sourceCounts['(original)'] = (sourceCounts['(original)'] || 0) + 1;
  }

  // options
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    fail(`${label}: options must be an array of exactly 4.`);
  } else if (!q.options.every((o) => typeof o === 'string' && o.trim() !== '')) {
    fail(`${label}: every option must be a non-empty string.`);
  }

  // answer
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
    fail(`${label}: answer must be an integer in 0..3.`);
  } else {
    answerCounts[q.answer]++;
  }

  // principle references a real reference id (and not an elimination-rule id)
  if (typeof q.principle === 'string') {
    if (!referenceIds.has(q.principle)) {
      fail(`${label}: principle "${q.principle}" not found in reference ids.`);
    } else if (elimIds.has(q.principle)) {
      fail(`${label}: principle "${q.principle}" is an elimination-rule id; link to a Principle or Gotcha instead.`);
    }
  }

  // hint must not leak the answer verbatim
  if (
    Array.isArray(q.options) &&
    Number.isInteger(q.answer) &&
    typeof q.hint === 'string' &&
    q.options[q.answer] &&
    q.hint.includes(q.options[q.answer])
  ) {
    warn(`${label}: hint appears to contain the correct option verbatim.`);
  }

  // references: optional, but when present must be page-level URLs on an allowed
  // host. Liveness is not checked here (validation stays offline) — that gate
  // lives in the merge step that adds them.
  if (q.references !== undefined) {
    if (!Array.isArray(q.references)) {
      fail(`${label}: "references" must be an array of URL strings.`);
    } else {
      for (const url of q.references) {
        if (typeof url !== 'string') {
          fail(`${label}: reference entries must be strings.`);
        } else if (url.includes('#')) {
          fail(`${label}: reference "${url}" contains a #fragment — page-level URLs only.`);
        } else {
          let host = null;
          try {
            host = new URL(url).host;
          } catch {
            fail(`${label}: reference "${url}" is not a valid URL.`);
          }
          if (host && !REFERENCE_HOSTS.has(host)) {
            fail(`${label}: reference host "${host}" is not an allowed documentation host.`);
          }
        }
      }
    }
  }

  // Answer-length tell, measured in both directions (see the band check below).
  if (Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.answer)) {
    const lens = q.options.map((o) => (typeof o === 'string' ? o.length : 0));
    if (lens[q.answer] === Math.max(...lens)) longestCorrect++;
    if (lens[q.answer] === Math.min(...lens)) shortestCorrect++;
  }
}

// ---- Distribution checks (soft) ----
const total = questions.length;

// Answer-index skew: warn if any index is used < half or > double the even share.
const evenShare = total / 4;
answerCounts.forEach((c, idx) => {
  if (c < evenShare * 0.5 || c > evenShare * 2) {
    warn(
      `Answer-index ${idx} used ${c}/${total} times — skewed vs even share ~${evenShare.toFixed(1)}.`,
    );
  }
});

// Cloned guidance. hint/tip/eliminationRule are the per-question coaching the
// study mode surfaces; when a batch import reuses one set across several
// questions, the app teaches the same nudge repeatedly and the questions stop
// being individually useful. Guidance must be authored per question.
const guidanceKey = (q) =>
  ['hint', 'tip', 'eliminationRule']
    .map((f) => (typeof q[f] === 'string' ? q[f].toLowerCase().replace(/[^a-z ]/g, '').trim() : ''))
    .join('|');
const guidanceGroups = new Map();
for (const q of questions) {
  if (!q || typeof q !== 'object' || !q.id) continue;
  const k = guidanceKey(q);
  if (!k.replace(/\|/g, '')) continue;
  if (!guidanceGroups.has(k)) guidanceGroups.set(k, []);
  guidanceGroups.get(k).push(q.id);
}
const clonedGroups = [...guidanceGroups.values()].filter((ids) => ids.length > 1);
const clonedCount = clonedGroups.reduce((n, ids) => n + ids.length, 0);
if (clonedGroups.length) {
  warn(
    `${clonedCount} question(s) in ${clonedGroups.length} group(s) share identical hint/tip/eliminationRule text — guidance must be authored per question. Worst: ${clonedGroups
      .slice()
      .sort((a, b) => b.length - a.length)[0]
      .join(', ')}`,
  );
}

// Principle concentration. `principle` drives the tier-2 hint, the "Learn more"
// link, and the targeted-drill filter, so a principle attached to a third of a
// domain makes all three useless there — the hint stops nudging and the drill
// stops being targeted. match-fix-to-failure is the usual offender: it is the
// broadest of the five and becomes the default when the author is unsure.
const PRINCIPLE_DOMAIN_CEILING = 35;
const principleByDomain = {};
for (const q of questions) {
  if (!q || typeof q.principle !== 'string' || !DOMAINS.includes(q.domain)) continue;
  ((principleByDomain[q.domain] ??= {})[q.principle] ??= 0);
  principleByDomain[q.domain][q.principle]++;
}
for (const d of DOMAINS) {
  const counts = principleByDomain[d];
  if (!counts) continue;
  const n = domainCounts[d];
  if (!n) continue;
  for (const [p, c] of Object.entries(counts)) {
    const pct = (c / n) * 100;
    if (pct > PRINCIPLE_DOMAIN_CEILING) {
      warn(
        `Domain "${d}": principle "${p}" on ${c}/${n} (${pct.toFixed(0)}%) — above the ${PRINCIPLE_DOMAIN_CEILING}% ceiling, diluting hints and targeted drills.`,
      );
    }
  }
}

// Answer-length band. With 4 options the no-signal baseline is 25%. A real exam
// carries a mild long-correct skew (correct answers tend to be the more qualified
// ones), so we want that skew present but not exploitable — hence a band, not a
// ceiling. Below the floor the bank teaches an inverse heuristic ("the short one
// is right") that the real exam will not reward.
const LENGTH_BAND = { floor: 20, ceiling: 40 };
const longestPct = total ? (longestCorrect / total) * 100 : 0;
const shortestPct = total ? (shortestCorrect / total) * 100 : 0;
if (longestPct > LENGTH_BAND.ceiling) {
  warn(
    `Correct answer is the longest option in ${longestCorrect}/${total} (${longestPct.toFixed(0)}%) — above the ${LENGTH_BAND.ceiling}% ceiling ("the tell").`,
  );
} else if (longestPct < LENGTH_BAND.floor) {
  warn(
    `Correct answer is the longest option in only ${longestCorrect}/${total} (${longestPct.toFixed(0)}%) — below the ${LENGTH_BAND.floor}% floor, which teaches an inverse "shortest is right" tell.`,
  );
}
if (shortestPct > LENGTH_BAND.ceiling) {
  warn(
    `Correct answer is the shortest option in ${shortestCorrect}/${total} (${shortestPct.toFixed(0)}%) — above the ${LENGTH_BAND.ceiling}% ceiling (inverse tell).`,
  );
}

// ---- Report ----
function report() {
  console.log('\n=== CCA-F question bank validation ===\n');
  console.log(`Total questions: ${total ?? 0}`);

  console.log('\nPer-domain counts:');
  for (const d of DOMAINS) console.log(`  ${d.padEnd(5)} ${domainCounts[d] ?? 0}`);

  console.log('\nPer-answer-index distribution:');
  answerCounts.forEach((c, idx) => console.log(`  [${idx}] ${c}`));

  console.log('\nPer-source counts:');
  for (const k of Object.keys(sourceCounts).sort()) console.log(`  ${k.padEnd(16)} ${sourceCounts[k]}`);

  console.log(
    `\nAnswer-length tell (target band ${LENGTH_BAND.floor}–${LENGTH_BAND.ceiling}%, no-signal baseline 25%):`,
  );
  console.log(`  longest option correct:  ${longestCorrect}/${total} (${longestPct.toFixed(0)}%)`);
  console.log(`  shortest option correct: ${shortestCorrect}/${total} (${shortestPct.toFixed(0)}%)`);

  // scenarioSet coverage (informational)
  const setCounts = Object.fromEntries(SCENARIO_SETS.map((s) => [s, 0]));
  for (const q of questions) if (q && setCounts[q.scenarioSet] !== undefined) setCounts[q.scenarioSet]++;
  console.log('\nScenario-set coverage:');
  for (const s of SCENARIO_SETS) console.log(`  ${s.padEnd(22)} ${setCounts[s]}`);

  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  WARN  ${w}`);
  }

  if (errors.length) {
    console.log(`\n${errors.length} error(s):`);
    for (const e of errors) console.log(`  FAIL  ${e}`);
    console.log('\nVALIDATION FAILED.\n');
  } else {
    console.log('\nAll hard checks passed.\n');
  }
}

report();
process.exit(errors.length ? 1 : 0);
