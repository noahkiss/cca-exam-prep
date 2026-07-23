// Loads and validates learning modules. Content lives in data/modules.json and
// is imported at build, exactly like the question bank — same defensive contract
// as lib/questions.ts: a malformed entry is dropped with a console warning
// rather than crashing the app, so one bad authored step can never white-screen
// a study session.
//
// Grading lives here too, and it is deliberately dumb: set equality for
// classify, sequence equality for order. No free text is ever graded. That is
// the structural guard against anyone bolting an LLM judge onto this later.

import type {
  ClassifyStep,
  Domain,
  LearningModule,
  ModuleStep,
  OrderStep,
} from '@/types';
import { DOMAIN_BY_ID, EXAM_SCOPES } from '@/types';
import rawModules from '../../data/modules.json';

const VALID_EXAM_SCOPES = new Set<string>(EXAM_SCOPES);
const STEP_TYPES = new Set(['teach', 'classify', 'order', 'quiz']);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isNonEmptyString);
}

function isValidStep(s: unknown, warnCtx: string): s is ModuleStep {
  if (typeof s !== 'object' || s === null) return false;
  const o = s as Record<string, unknown>;
  if (!isNonEmptyString(o.id) || !isNonEmptyString(o.title)) return false;
  if (!isNonEmptyString(o.type) || !STEP_TYPES.has(o.type)) return false;

  switch (o.type) {
    case 'teach':
      return isNonEmptyString(o.body);

    case 'classify': {
      if (!isNonEmptyString(o.prompt)) return false;
      if (!Array.isArray(o.buckets) || o.buckets.length < 2) return false;
      const bucketIds = new Set<string>();
      for (const b of o.buckets) {
        const bo = b as Record<string, unknown>;
        if (!isNonEmptyString(bo?.id) || !isNonEmptyString(bo?.label)) return false;
        bucketIds.add(bo.id);
      }
      if (!Array.isArray(o.items) || o.items.length === 0) return false;
      for (const it of o.items) {
        const io = it as Record<string, unknown>;
        if (!isNonEmptyString(io?.id) || !isNonEmptyString(io?.text)) return false;
        if (!isNonEmptyString(io?.why)) return false;
        // An item keyed to a bucket that doesn't exist is ungradeable.
        if (!isNonEmptyString(io?.bucket) || !bucketIds.has(io.bucket)) {
          // eslint-disable-next-line no-console
          console.warn(`[modules] ${warnCtx}: item "${io?.id}" keys unknown bucket`, io?.bucket);
          return false;
        }
      }
      return true;
    }

    case 'order': {
      if (!isNonEmptyString(o.prompt)) return false;
      if (!Array.isArray(o.items) || o.items.length < 2) return false;
      const itemIds: string[] = [];
      for (const it of o.items) {
        const io = it as Record<string, unknown>;
        if (!isNonEmptyString(io?.id) || !isNonEmptyString(io?.label)) return false;
        itemIds.push(io.id);
      }
      const set = new Set(itemIds);
      if (set.size !== itemIds.length) return false;
      // correctOrder must be a permutation of items — not a subset, not a superset.
      if (!isStringArray(o.correctOrder)) return false;
      if (o.correctOrder.length !== itemIds.length) return false;
      if (!o.correctOrder.every((id) => set.has(id))) return false;
      if (new Set(o.correctOrder).size !== o.correctOrder.length) return false;
      if (o.acceptableOrders !== undefined) {
        if (!Array.isArray(o.acceptableOrders)) return false;
        for (const alt of o.acceptableOrders) {
          if (!isStringArray(alt) || alt.length !== itemIds.length) return false;
          if (new Set(alt).size !== alt.length || !alt.every((id) => set.has(id))) return false;
        }
      }
      if (typeof o.why !== 'object' || o.why === null) return false;
      return true;
    }

    case 'quiz':
      // Deliberately NOT resolved against the question bank here. Doing so made
      // this module a static dependency of the ~540 kB bank chunk, which then
      // rode along on every page that touches the store. The dangling-reference
      // case is caught earlier and later instead: `scripts/validate-modules.mjs`
      // fails the build on a quiz pointing at an unknown question, and
      // `QuizStepView` renders nothing rather than an empty card if one slips by.
      return isNonEmptyString(o.questionId);

    default:
      return false;
  }
}

function isValidModule(m: unknown): m is LearningModule {
  if (typeof m !== 'object' || m === null) return false;
  const o = m as Record<string, unknown>;
  for (const f of ['id', 'title', 'outcome'] as const) {
    if (!isNonEmptyString(o[f])) return false;
  }
  if (typeof o.domain !== 'string' || !(o.domain in DOMAIN_BY_ID)) return false;
  if (o.kind !== 'core' && o.kind !== 'capstone') return false;
  if (
    o.examScope !== undefined &&
    !(typeof o.examScope === 'string' && VALID_EXAM_SCOPES.has(o.examScope))
  ) {
    return false;
  }
  if (!isStringArray(o.objectives) || o.objectives.length === 0) return false;
  if (!isStringArray(o.principles)) return false;
  if (typeof o.order !== 'number' || !Number.isFinite(o.order)) return false;
  if (typeof o.estimatedMinutes !== 'number' || o.estimatedMinutes <= 0) return false;
  if (!Array.isArray(o.steps) || o.steps.length === 0) return false;

  const stepIds = new Set<string>();
  for (const s of o.steps) {
    if (!isValidStep(s, `module "${o.id}"`)) return false;
    const id = (s as { id: string }).id;
    if (stepIds.has(id)) {
      // eslint-disable-next-line no-console
      console.warn(`[modules] module "${o.id}": duplicate step id`, id);
      return false;
    }
    stepIds.add(id);
  }
  return true;
}

function loadModules(): LearningModule[] {
  // Widened to unknown[]: an empty data/modules.json infers as never[], which
  // would make every field access below a type error rather than a runtime check.
  const arr: unknown[] = Array.isArray(rawModules) ? (rawModules as unknown[]) : [];
  const valid: LearningModule[] = [];
  const seen = new Set<string>();
  for (const m of arr) {
    if (!isValidModule(m)) {
      // eslint-disable-next-line no-console
      console.warn('[modules] skipping malformed module', (m as { id?: string })?.id ?? m);
      continue;
    }
    if (seen.has(m.id)) {
      // eslint-disable-next-line no-console
      console.warn('[modules] skipping duplicate id', m.id);
      continue;
    }
    seen.add(m.id);
    valid.push(m);
  }
  return valid.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** All validated modules, ordered by track position. */
export const MODULES: LearningModule[] = loadModules();

export const MODULE_BY_ID: Record<string, LearningModule> = Object.fromEntries(
  MODULES.map((m) => [m.id, m]),
);

/** Every step, keyed `<moduleId>:<stepId>` — the id shape used in the attempt log. */
export const STEP_BY_KEY: Record<string, { module: LearningModule; step: ModuleStep }> =
  Object.fromEntries(
    MODULES.flatMap((m) => m.steps.map((s) => [stepKey(m.id, s.id), { module: m, step: s }])),
  );

/** The attempt-log id for a module step. Namespaced so it can't collide with a question id. */
export function stepKey(moduleId: string, stepId: string): string {
  return `mod:${moduleId}:${stepId}`;
}

export function modulesByDomain(domain: Domain): LearningModule[] {
  return MODULES.filter((m) => m.domain === domain);
}

/** True when a step produces a pass/fail outcome. `teach` steps never do. */
export function isGraded(step: ModuleStep): boolean {
  return step.type !== 'teach';
}

/** Steps in a module that count toward its completion percentage. */
export function gradedSteps(m: LearningModule): ModuleStep[] {
  return m.steps.filter(isGraded);
}

/**
 * Grade a classify step: every item must sit in its keyed bucket. Partial
 * placement is a miss — the exam does not award partial credit either.
 */
export function gradeClassify(step: ClassifyStep, placed: Record<string, string>): boolean {
  return step.items.every((i) => placed[i.id] === i.bucket);
}

/**
 * Grade an order step against `correctOrder` or any declared alternate. Genuinely
 * commutative stages must be encoded in `acceptableOrders` rather than silently
 * tolerated, so a wrong sequence stays wrong.
 */
export function gradeOrder(step: OrderStep, submitted: string[]): boolean {
  const matches = (target: string[]) =>
    target.length === submitted.length && target.every((id, i) => submitted[i] === id);
  if (matches(step.correctOrder)) return true;
  return (step.acceptableOrders ?? []).some(matches);
}
