// localStorage-backed persistence. No accounts, no server, no telemetry —
// everything the app remembers lives in the browser under a single namespaced
// key. All reads are defensive (corrupt/absent → defaults).

import type { Domain } from '@/types';
import type { SrsCard } from './srs';

const STORAGE_KEY = 'cca-exam-prep:v1';

/** Current on-disk schema version. Bump + add a migration when the shape changes. */
export const STATE_VERSION = 2;

/** Keep at most this many attempt-log entries (drop oldest). */
export const ATTEMPT_LOG_CAP = 2000;

/** Which mode a single question drill happened in. */
export type DrillMode = 'study' | 'exam' | 'review';

/**
 * One appended-only record of a single question drill. We store only the
 * question `id` (not domain/principle/scenarioSet) so the log survives bank
 * edits — analysis re-joins against the live QUESTIONS_BY_ID at read time.
 */
export interface AttemptLog {
  id: string;
  ts: number;
  correct: boolean;
  usedHint: boolean;
  mode: DrillMode;
}

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
  version: 2;
  questionStats: Record<string, QuestionStat>;
  /** Ids the user has missed at least once and not since retired. */
  missed: string[];
  srs: Record<string, SrsCard>;
  exams: ExamRecord[];
  /** Append-only log of individual drills, capped at ATTEMPT_LOG_CAP (oldest dropped). */
  attempts: AttemptLog[];
  theme: 'light' | 'dark' | 'system';
}

function defaultState(): AppState {
  return {
    version: STATE_VERSION,
    questionStats: {},
    missed: [],
    srs: {},
    exams: [],
    attempts: [],
    theme: 'system',
  };
}

/**
 * Migrate an older persisted blob up to the current version. Forward-fills any
 * missing fields with defaults, then applies each step. v1 had no attempt log,
 * so migrating just seeds an empty one. Exported for unit testing.
 */
export function migrate(parsed: Omit<Partial<AppState>, 'version'> & { version?: number }): AppState {
  const merged = { ...defaultState(), ...parsed } as AppState;
  const from = typeof parsed.version === 'number' ? parsed.version : 1;
  if (from < 2 && !Array.isArray(parsed.attempts)) {
    merged.attempts = [];
  }
  merged.version = STATE_VERSION;
  return merged;
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
    const parsed = JSON.parse(raw) as Omit<Partial<AppState>, 'version'> & { version?: number };
    cache = migrate(parsed);
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
