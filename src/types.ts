// Shared domain model for the CCA-F exam prep app.
// This file is the contract every part of the app (and the question bank) builds against.

/** The five exam domains. Codes are used as `Question.domain`. */
export type Domain = 'arch' | 'cc' | 'pe' | 'mcp' | 'ctx';

export interface DomainMeta {
  id: Domain;
  /** Short label for chips/badges. */
  short: string;
  /** Full domain name from the blueprint. */
  name: string;
  /** Official blueprint weight, as a percentage (sums to 100). */
  weight: number;
  /** One-line description of what the domain covers. */
  blurb: string;
}

/** Domain weights per the official CCA-F blueprint (plan.md §2). */
export const DOMAINS: DomainMeta[] = [
  {
    id: 'arch',
    short: 'Architecture',
    name: 'Agentic Architecture & Orchestration',
    weight: 27,
    blurb: 'Agent-vs-workflow, orchestration patterns, subagent isolation, completion signals, hooks-vs-prompts.',
  },
  {
    id: 'cc',
    short: 'Claude Code',
    name: 'Claude Code Configuration & Workflows',
    weight: 20,
    blurb: 'Config scope, hooks, path-scoped rules, slash commands, planning mode, headless CI.',
  },
  {
    id: 'pe',
    short: 'Prompt Eng.',
    name: 'Prompt Engineering & Structured Output',
    weight: 20,
    blurb: 'Few-shot, tool-schema output, tool_choice, extended thinking, retries, caching, message structure.',
  },
  {
    id: 'mcp',
    short: 'Tools & MCP',
    name: 'Tool Design & MCP Integration',
    weight: 18,
    blurb: 'Tool descriptions, MCP primitives, transports, structured errors, empty-vs-error, output trimming.',
  },
  {
    id: 'ctx',
    short: 'Context',
    name: 'Context Management & Reliability',
    weight: 15,
    blurb: 'Compaction, lost-in-the-middle, escalation policy, provenance, stratified accuracy, batch API.',
  },
];

export const DOMAIN_BY_ID: Record<Domain, DomainMeta> = Object.fromEntries(
  DOMAINS.map((d) => [d.id, d]),
) as Record<Domain, DomainMeta>;

/**
 * The six scenario sets the exam draws from (plan.md §1). The real exam samples
 * 4 of these 6 (~15 Q each). Optional on a question, but recommended so exam mode
 * can do authentic 4-of-6 sampling.
 */
export type ScenarioSet =
  | 'support-agent'
  | 'code-gen'
  | 'multi-agent-research'
  | 'dev-productivity'
  | 'ci'
  | 'data-extraction';

export interface ScenarioSetMeta {
  id: ScenarioSet;
  name: string;
}

export const SCENARIO_SETS: ScenarioSetMeta[] = [
  { id: 'support-agent', name: 'Customer Support Resolution Agent' },
  { id: 'code-gen', name: 'Code Generation with Claude Code' },
  { id: 'multi-agent-research', name: 'Multi-Agent Research System' },
  { id: 'dev-productivity', name: 'Developer Productivity with Claude' },
  { id: 'ci', name: 'Claude Code for Continuous Integration' },
  { id: 'data-extraction', name: 'Structured Data Extraction' },
];

/**
 * A single practice question. Mirrors plan.md §8. Every question MUST carry
 * hint, explanation, eliminationRule, and tip — the meta-learning is part of
 * the schema, not optional.
 */
export interface Question {
  /** Stable unique id, e.g. "arch-012". */
  id: string;
  domain: Domain;
  /** Which of the six scenario sets this belongs to (for 4-of-6 exam sampling). */
  scenarioSet?: ScenarioSet;
  /** The broken-system / situation context. */
  scenario: string;
  /** The actual question stem. */
  question: string;
  /** Answer options in canonical (authoring) order. Rendered shuffled. */
  options: string[];
  /** Index into `options` of the correct answer. Deterministic key. */
  answer: number;
  /** Progressive nudge toward the right principle — never reveals the answer. */
  hint: string;
  /** Why the right answer wins AND why each distractor fails. */
  explanation: string;
  /** Which instant-elimination rule applies (plan.md §5). Human-readable. */
  eliminationRule: string;
  /** The trick/gotcha/helpful-to-know tied to THIS question (plan.md §3/§4/§6). */
  tip: string;
  /** Id of the reference entry (principle/gotcha) this links to. See reference.ts. */
  principle: string;
}

/** ---- Reference ("Get a step ahead") content model ---- */

/** An external link to an authoritative source (Anthropic docs, MCP spec, etc.). */
export interface Resource {
  label: string;
  url: string;
}

export interface Principle {
  id: string;
  title: string;
  /** Markdown-ish body (plain text with newlines; no HTML). */
  body: string;
  /** Optional authoritative sources to read for this principle. */
  resources?: Resource[];
}

export interface EliminationRule {
  id: string;
  /** The "an answer is almost certainly wrong if it…" clause. */
  text: string;
  /** Why — the underlying principle. */
  why: string;
}

export interface Gotcha {
  id: string;
  title: string;
  body: string;
  /** Optional authoritative sources to read for this gotcha. */
  resources?: Resource[];
}
