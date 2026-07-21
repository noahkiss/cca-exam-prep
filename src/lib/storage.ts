// localStorage-backed persistence. No accounts, no server, no telemetry —
// everything the app remembers lives in the browser under a single namespaced
// key. All reads are defensive (corrupt/absent → defaults).

import type { Domain } from '@/types';
import type { SrsCard } from './srs';

const STORAGE_KEY = 'cca-exam-prep:v1';

/** Per-question aggregate history across all modes. */
export interface QuestionStat {
  id: string;
  domain: Domain;
  attempts: number;
  correct: number;
  lastCorrect: boolean;
  lastSeen: number;
}

/** A completed exam attempt, for the dashboard history. */
export interface ExamRecord {
  id: string;
  date: number;
  scaled: number;
  passedStrict: boolean;
  total: number;
  correct: number;
  /** scaled score per domain, keyed by domain id. */
  domainScaled: Partial<Record<Domain, number>>;
}

export interface AppState {
  version: 1;
  questionStats: Record<string, QuestionStat>;
  /** Ids the user has missed at least once and not since retired. */
  missed: string[];
  srs: Record<string, SrsCard>;
  exams: ExamRecord[];
  theme: 'light' | 'dark' | 'system';
}

function defaultState(): AppState {
  return {
    version: 1,
    questionStats: {},
    missed: [],
    srs: {},
    exams: [],
    theme: 'system',
  };
}

let cache: AppState | null = null;

export function loadState(): AppState {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cache = defaultState();
      return cache;
    }
    const parsed = JSON.parse(raw) as Partial<AppState>;
    cache = { ...defaultState(), ...parsed, version: 1 };
    return cache;
  } catch {
    cache = defaultState();
    return cache;
  }
}

export function saveState(state: AppState): void {
  cache = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable (private mode) — fail silently; the app
    // still works for the current session from the in-memory cache.
  }
}

/** Apply a mutation and persist. Returns the new state. */
export function updateState(mutator: (s: AppState) => void): AppState {
  const next = { ...loadState() };
  mutator(next);
  saveState(next);
  return next;
}

export function resetState(): AppState {
  cache = defaultState();
  saveState(cache);
  return cache;
}
