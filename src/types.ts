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

/**
 * Whether a piece of content is on the certification blueprint.
 *
 * `blueprint` (the default when the field is absent) means the official Exam
 * Guide v1.0 covers the topic, so it belongs in exam draws and in mastery math.
 * `supplementary` means the topic is genuinely useful engineering knowledge that
 * the guide's Out-of-Scope list rules out — MCP transports, `cache_control`
 * placement. Supplementary content is kept and clearly badged, never dropped,
 * but it must not be sampled into an exam, scored, or counted toward mastery:
 * a strong transports score must not inflate apparent `mcp` readiness on a
 * topic that cannot appear on the exam.
 */
export type ExamScope = 'blueprint' | 'supplementary';

export const EXAM_SCOPES: ExamScope[] = ['blueprint', 'supplementary'];

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
  /**
   * Defaults to `blueprint` when absent. `supplementary` questions are excluded
   * from exam draws, from scoring, and from mastery — see `ExamScope`.
   */
  examScope?: ExamScope;
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
  /**
   * Official doc pages backing this question's answer — "Learn more", not proof.
   * Page-level URLs only: a #fragment still returns 200 after its anchor is gone,
   * so it survives liveness checks while landing the reader on nothing. Optional
   * and often absent — architectural-judgement questions frequently have no single
   * page that backs them, and an omitted link beats a fabricated one.
   */
  references?: string[];
}

/** ---- Learning modules ---- */

/** A fenced artifact rendered read-only inside a step. */
export interface CodeBlock {
  lang: 'json' | 'python' | 'bash' | 'yaml' | 'markdown' | 'text';
  caption?: string;
  source: string;
}

/**
 * Fields every step carries. Mirrors Question's meta-learning contract: the
 * hint/explanation/tip trio is part of the schema, not optional decoration.
 */
export interface StepBase {
  /** Unique within the module. */
  id: string;
  title: string;
  /** Reference entry id — powers ReferenceLink and the weak-spot rollup. */
  principle?: string;
  /** Progressive nudge. Never reveals the key. Same contract as Question.hint. */
  hint?: string;
  /** Shown after grading: why the key is right, why the plausible wrongs fail. */
  explanation?: string;
  /** The gotcha tied to THIS step. */
  tip?: string;
  /** Page-level doc URLs only — same discipline as Question.references. */
  references?: string[];
}

/** Ungraded exposition. Plain text with newlines, no HTML — as Principle.body. */
export interface TeachStep extends StepBase {
  type: 'teach';
  body: string;
  code?: CodeBlock[];
  callout?: { kind: 'warn' | 'note' | 'contrast'; body: string };
}

/** Sort items into fixed buckets. Graded: every item lands in its keyed bucket. */
export interface ClassifyStep extends StepBase {
  type: 'classify';
  prompt: string;
  buckets: { id: string; label: string; blurb?: string }[];
  items: { id: string; text: string; bucket: string; why: string }[];
}

/** Put stages in sequence. Graded against correctOrder or an acceptable alternate. */
export interface OrderStep extends StepBase {
  type: 'order';
  prompt: string;
  items: { id: string; label: string }[];
  correctOrder: string[];
  /** For genuinely commutative stages — encode it rather than pick a canon. */
  acceptableOrders?: string[][];
  /** Per-item rationale, revealed after grading. */
  why: Record<string, string>;
}

/** Pulls a question straight from the existing bank. No inline duplication. */
export interface QuizStep extends StepBase {
  type: 'quiz';
  questionId: string;
}

/**
 * Tier 1 step types. `diagnose`/`build` (Tier 2) and `trace`/`reflect` (Tier 3)
 * join this union when their renderers land; keeping the union narrow means the
 * renderer's exhaustiveness check catches an unimplemented type at compile time.
 */
export type ModuleStep = TeachStep | ClassifyStep | OrderStep | QuizStep;

/** Step types that produce a graded outcome. `teach` is exposition only. */
export type GradedStepType = 'classify' | 'order' | 'quiz';

/** A guided study module. Content lives in data/modules.json. */
export interface LearningModule {
  /** Stable id, e.g. "arch-agentic-loop". */
  id: string;
  /** Primary domain — module results join into mastery on this key. */
  domain: Domain;
  kind: 'core' | 'capstone';
  /** See ExamScope. Supplementary modules are excluded from mastery. */
  examScope?: ExamScope;
  title: string;
  /** One-line promise: what the candidate can do after this module. */
  outcome: string;
  /** 3–6 concrete capabilities this module certifies. */
  objectives: string[];
  /** Ordering within the domain track. */
  order: number;
  estimatedMinutes: number;
  /** Module ids that should come first. Soft gating — advisory, never blocking. */
  prerequisites?: string[];
  /** Reference entry ids (see reference.ts) this module teaches. */
  principles: string[];
  /** Scenario sets the exercises are framed in. */
  scenarioSets?: ScenarioSet[];
  references?: string[];
  steps: ModuleStep[];
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
