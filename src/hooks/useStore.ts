// A tiny reactive wrapper over the localStorage-backed AppState using
// useSyncExternalStore, so any component re-renders when progress changes.

import { useSyncExternalStore } from 'react';
import type { Domain } from '@/types';
import {
  loadState,
  updateState,
  resetState,
  ATTEMPT_LOG_CAP,
  type AppState,
  type DrillMode,
  type ExamRecord,
  type ModuleProgress,
  type QuestionStat,
} from '@/lib/storage';
import { newCard, qualityFor, review, type SrsCard } from '@/lib/srs';
import { MODULE_BY_ID, stepKey } from '@/lib/modules';

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AppState {
  return loadState();
}

/** Record the outcome of a single question drill (study / exam / review modes). */
export function recordAnswer(params: {
  id: string;
  domain: Domain;
  correct: boolean;
  usedHint: boolean;
  mode: DrillMode;
}): void {
  const { id, domain, correct, usedHint, mode } = params;
  const now = Date.now();
  updateState((s) => {
    const prev: QuestionStat = s.questionStats[id] ?? {
      id,
      domain,
      attempts: 0,
      correct: 0,
      lastCorrect: false,
      lastSeen: 0,
    };
    s.questionStats = {
      ...s.questionStats,
      [id]: {
        ...prev,
        domain,
        attempts: prev.attempts + 1,
        correct: prev.correct + (correct ? 1 : 0),
        lastCorrect: correct,
        lastSeen: now,
      },
    };

    // Missed list: add on miss, retire on a correct answer.
    const missedSet = new Set(s.missed);
    if (correct) missedSet.delete(id);
    else missedSet.add(id);
    s.missed = [...missedSet];

    // SM-2 update.
    const card: SrsCard = s.srs[id] ?? newCard(id, now);
    s.srs = { ...s.srs, [id]: review(card, qualityFor(correct, usedHint), now) };

    // Append-only attempt log for trend/recency analysis, capped (oldest dropped).
    const next = [...s.attempts, { id, ts: now, correct, usedHint, mode }];
    s.attempts = next.length > ATTEMPT_LOG_CAP ? next.slice(-ATTEMPT_LOG_CAP) : next;
  });
  emit();
}

/**
 * Record progress through a single learning-module step.
 *
 * `correct: null` means ungraded (a `teach` step): it advances progress but is
 * never evidence, so it is deliberately kept out of the attempt log — that log
 * is what `weakSpots` reads, and `AttemptLog.correct` is a plain boolean with no
 * honest encoding for "not graded".
 *
 * `quiz` steps are also skipped here, because the caller records them through
 * `recordAnswer` under the real question id. That entry is strictly better: it
 * resolves to the question's own principle and scenario set, and it feeds
 * `questionStats`, `missed` and SM-2. Logging both would double-count the domain.
 *
 * A graded non-quiz step also gets its own SM-2 card, keyed by `stepKey` so it
 * cannot collide with a question id. It deliberately stays out of
 * `questionStats` and `missed`: both are question-only, and the review page's
 * missed tab resolves its ids against the question bank.
 */
export function recordStep(params: {
  moduleId: string;
  stepId: string;
  /** `null` for ungraded exposition. */
  correct: boolean | null;
  usedHint: boolean;
  /** Where the attempt happened. `module` (walking the module) unless the SM-2 queue drove it. */
  mode?: DrillMode;
}): void {
  const { moduleId, stepId, correct, usedHint, mode = 'module' } = params;
  const now = Date.now();
  updateState((s) => {
    const prev: ModuleProgress = s.modules[moduleId] ?? {
      id: moduleId,
      startedAt: now,
      lastStepId: stepId,
      steps: {},
    };
    const prevStep = prev.steps[stepId];
    const next: ModuleProgress = {
      ...prev,
      lastStepId: stepId,
      steps: {
        ...prev.steps,
        [stepId]: {
          correct,
          attempts: (prevStep?.attempts ?? 0) + 1,
          // Sticky: a hint taken on any attempt stays taken.
          usedHint: usedHint || (prevStep?.usedHint ?? false),
          ts: now,
        },
      },
    };

    const mod = MODULE_BY_ID[moduleId];
    if (mod && next.completedAt === undefined && mod.steps.every((st) => next.steps[st.id])) {
      next.completedAt = now;
    }
    s.modules = { ...s.modules, [moduleId]: next };

    const isQuiz = mod?.steps.find((st) => st.id === stepId)?.type === 'quiz';
    if (correct !== null && !isQuiz) {
      const key = stepKey(moduleId, stepId);
      const entry = { id: key, ts: now, correct, usedHint, mode };
      const log = [...s.attempts, entry];
      s.attempts = log.length > ATTEMPT_LOG_CAP ? log.slice(-ATTEMPT_LOG_CAP) : log;

      // SM-2 update, same shape as recordAnswer but under the namespaced key.
      const card: SrsCard = s.srs[key] ?? newCard(key, now);
      s.srs = { ...s.srs, [key]: review(card, qualityFor(correct, usedHint), now) };
    }
  });
  emit();
}

/** Persist a completed exam attempt. */
export function recordExam(record: ExamRecord): void {
  updateState((s) => {
    s.exams = [record, ...s.exams].slice(0, 50);
  });
  emit();
}

export function setTheme(theme: AppState['theme']): void {
  updateState((s) => {
    s.theme = theme;
  });
  emit();
}

export function clearAllProgress(): void {
  resetState();
  emit();
}

/** React hook: subscribe to the whole app state. */
export function useStore(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
