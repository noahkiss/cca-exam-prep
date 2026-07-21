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
  type QuestionStat,
} from '@/lib/storage';
import { newCard, qualityFor, review, type SrsCard } from '@/lib/srs';

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
