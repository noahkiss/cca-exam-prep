// The "Get a step ahead" reference content (plan.md §3/§5/§6).
// This is the highest-value study surface — the meta-game that puts users ahead
// of people who only grind question banks. Questions cross-link here via
// `Question.principle` (matching a Principle or Gotcha id).

import type { Principle, EliminationRule, Gotcha } from '../types';

/** §3 — the 5 exam-thinking principles (plus the two load-bearing meta-tells). */
export const PRINCIPLES: Principle[] = [
  {
    id: 'constrain-dont-add',
    title: '1. Constrain, don’t add',
    body: `"More tools / more agents / a bigger context window / fine-tune it" is almost always the WRONG answer.

The exam is testing whether you build a reliable system around a fallible model — not whether you can throw more capability at a reliability problem. When a system misbehaves, the architect's instinct is to remove ambiguity and add constraints, not to add surface area.

Watch for: any option that solves a reliability/consistency problem by adding capability. It's a trap the vast majority of the time.`,
  },
  {
    id: 'prompts-suggest-systems-enforce',
    title: '2. Prompts suggest; systems enforce',
    body: `If a rule must ALWAYS hold — money, compliance, ordering, safety, irreversible actions — enforce it in code or a hook, not by asking the model nicely.

Hooks are 100% deterministic. Prompts are ~90% probabilistic. A PreToolUse hook can block/deny a tool call; a prompt can only make the right behavior more likely. For anything where a single violation is unacceptable, the enforcement point is code.

Watch for: "instruct the model to always…", "add a strong instruction to the system prompt…", "tell it to be careful about…" as fixes for hard guarantees. Those are prompt-level fixes for problems that need a code-level gate.`,
  },
  {
    id: 'fix-earliest-layer',
    title: '3. Fix the earliest layer',
    body: `Most wrong answers are reasonable fixes applied too late in the pipeline. Trace the failure upstream and fix it at its origin.

If the model picks the wrong tool, fixing the router is downstream of fixing the tool descriptions. If output is malformed, validating harder downstream is worse than defining a schema upstream. The best fix removes the failure's cause, not its symptom.

Watch for: options that patch a late stage (retry, validator, classifier, human review) when an earlier stage (description, schema, prompt structure) is the actual cause.`,
  },
  {
    id: 'match-fix-to-failure',
    title: '4. Match the fix to the failure',
    body: `Each failure mode has a canonical fix. Memorize the mapping:

- vague rule  → explicit criteria
- inconsistent output  → few-shot examples (2–4 pairs)
- invalid JSON  → schema / structured (tool) output
- valid-but-wrong output  → semantic validation
- missing info in the source  → not fixable by retries (the info isn't there)

The correct answer is the fix that targets the SPECIFIC failure described, not a generically powerful technique.`,
  },
  {
    id: 'escalate-on-policy-not-vibes',
    title: '5. Don’t collapse states; escalate on policy, not vibes',
    body: `"Tool failed" ≠ "found nothing." An empty result is a successful empty result, not an error. Don't collapse distinct states into one.

Escalate to a human on explicit policy/workflow triggers — an explicit human request, a policy gap, a demonstrated inability to make progress. NEVER escalate on sentiment analysis or the model's self-rated confidence.

Watch for: "escalate when the user seems frustrated", "escalate when the model is unsure", "treat an empty search as a failure and retry." All wrong.`,
  },
  {
    id: 'meta-tell-balanced-not-maximal',
    title: 'Meta-tell: the correct answer feels balanced, not maximal',
    body: `The right answer usually feels reasonable, efficient, and proportionate — not the most aggressive, absolute, or "guaranteed/maximal" option.

"Fine-tune the model" and "tell it to be more careful" are essentially never correct. The most extreme option ("always", "never", "completely eliminate", "guarantee") is usually a distractor.`,
  },
];

/** §5 — instant-elimination rules. An answer is almost certainly wrong if it… */
export const ELIMINATION_RULES: EliminationRule[] = [
  {
    id: 'elim-add-to-fix-reliability',
    text: 'Adds tools / agents / context / fine-tuning to solve a reliability problem.',
    why: 'Violates "constrain, don’t add." Reliability comes from removing ambiguity, not adding capability.',
  },
  {
    id: 'elim-prompt-for-guarantee',
    text: 'Enforces a money/safety/compliance rule via prompt wording instead of a hook/code gate.',
    why: 'Prompts suggest; systems enforce. Hard guarantees need deterministic enforcement.',
  },
  {
    id: 'elim-sentiment-escalation',
    text: 'Uses sentiment or model confidence as an escalation trigger.',
    why: 'Escalate on policy, not vibes. Sentiment and self-confidence are not reliable signals.',
  },
  {
    id: 'elim-aggregate-accuracy',
    text: 'Reports aggregate-only accuracy to make a review/quality decision.',
    why: 'A 97% overall can hide a fully broken field. Use stratified/segmented accuracy.',
  },
  {
    id: 'elim-classifier-before-descriptions',
    text: 'Reaches for a routing classifier before improving tool descriptions.',
    why: 'Tool descriptions are the model’s primary selection mechanism. Fix the earliest layer first.',
  },
  {
    id: 'elim-parse-text-for-completion',
    text: 'Parses assistant text (instead of stop_reason) to detect completion.',
    why: 'stop_reason == "end_turn" is the only reliable "done" signal. Text parsing is brittle.',
  },
  {
    id: 'elim-empty-as-error',
    text: 'Treats an empty result as an error (or a tool failure as "nothing found").',
    why: 'Zero rows is a successful empty result. Collapsing states causes bad retry loops.',
  },
  {
    id: 'elim-critical-in-middle',
    text: 'Puts critical info in the middle of a long context.',
    why: 'Models reliably use the start and end of context and miss the middle (lost-in-the-middle).',
  },
];

/** §6 — gotchas, corrections, and tells. */
export const GOTCHAS: Gotcha[] = [
  {
    id: 'gotcha-message-roles',
    title: '⚠ Message-role correction (know this cold)',
    body: `There are only two message roles: user and assistant. There is NO "tool" role.

A tool result is a user-role message containing a tool_result content block. A popular study guide (paullarionov, issue #39 open) wrongly lists "tool" as a role — don't repeat that mistake on the exam.

A system message can also appear inline in the messages array (for mid-conversation instructions without invalidating the cached top-level system prefix), with strict placement rules: it must follow a user/assistant turn, it CANNOT sit between a tool_use block and its tool_result (that returns a 400), and later system messages take precedence. Message structure is directly testable.`,
  },
  {
    id: 'gotcha-answer-tell',
    title: 'The AI-authored answer tell (tiebreaker only)',
    body: `Because these banks were written with Claude, correct answers skew toward slots A/B and are often the longest option.

Position gets shuffled on the real exam (this app shuffles option order at render, too), but length can survive. Use this ONLY to break a genuine tie — a passer warns the tells largely vanish on the real thing, and third-party banks that over-encode this will mislead you. Learn the principles; don't lean on the tell.`,
  },
  {
    id: 'gotcha-thirdparty-banks',
    title: 'Third-party banks vary in quality',
    body: `Some third-party question banks encode reasoning that contradicts Anthropic guidance. Use them to drill recall, not to learn principles.

Learn principles from the official Exam Guide + Anthropic docs. If a bank's "correct" answer conflicts with the five principles, trust the principles.`,
  },
  {
    id: 'gotcha-maximal-trap',
    title: 'The "guaranteed/maximal" trap',
    body: `The most aggressive or absolute option is usually wrong; correct answers feel balanced. Words like "always", "never", "completely", "guarantee", and "eliminate entirely" are distractor flavor more often than not.`,
  },
  {
    id: 'gotcha-no-negative-marking',
    title: 'No negative marking — never leave a blank',
    body: `There is no penalty for wrong answers. Answer every question; guess if you must. Scaled 0–1000, pass at 720. Every domain should clear the bar — an 85% average with one weak domain can still fail.`,
  },
];

/** Fast lookup for cross-linking questions to their reference entry. */
export const REFERENCE_BY_ID: Record<string, { kind: 'principle' | 'gotcha'; title: string }> =
  Object.fromEntries([
    ...PRINCIPLES.map((p) => [p.id, { kind: 'principle' as const, title: p.title }]),
    ...GOTCHAS.map((g) => [g.id, { kind: 'gotcha' as const, title: g.title }]),
  ]);
