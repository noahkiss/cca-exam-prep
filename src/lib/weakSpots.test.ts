import { describe, it, expect, vi } from 'vitest';

// Controlled question bank so analysis is deterministic and independent of the
// real data/questions.json content.
vi.mock('@/lib/questions', () => ({
  QUESTIONS_BY_ID: {
    q1: { id: 'q1', domain: 'arch', principle: 'constrain-dont-add', scenarioSet: 'support-agent' },
    q2: { id: 'q2', domain: 'ctx', principle: 'match-fix-to-failure', scenarioSet: 'ci' },
    q3: {
      id: 'q3',
      domain: 'mcp',
      principle: 'constrain-dont-add',
      scenarioSet: 'support-agent',
      examScope: 'supplementary',
    },
  },
}));

// Likewise a controlled module set. `weakSpots` imports only STEP_BY_KEY and
// stepKey from here — keep this mock in sync if that ever changes, or the real
// module (and data/modules.json) loads and the fixtures below stop being the
// whole world.
vi.mock('@/lib/modules', () => ({
  stepKey: (moduleId: string, stepId: string) => `mod:${moduleId}:${stepId}`,
  STEP_BY_KEY: {
    'mod:m1:s1': {
      module: { id: 'm1', domain: 'arch', scenarioSets: ['support-agent'] },
      step: { id: 's1', type: 'classify', principle: 'constrain-dont-add' },
    },
    'mod:m1:s2': {
      // Quiz steps are counted under their question id, never here.
      module: { id: 'm1', domain: 'arch', scenarioSets: ['support-agent'] },
      step: { id: 's2', type: 'quiz', principle: 'constrain-dont-add' },
    },
    'mod:m2:s1': {
      module: { id: 'm2', domain: 'mcp', examScope: 'supplementary' },
      step: { id: 's1', type: 'order', principle: 'constrain-dont-add' },
    },
  },
}));

import { analyzeWeakSpots, topWeakSpots } from './weakSpots';
import { stepKey } from './modules';
import { migrate, STATE_VERSION, type AppState } from './storage';

const NOW = 1_700_000_000_000;

function baseState(): AppState {
  return {
    version: STATE_VERSION,
    questionStats: {},
    modules: {},
    missed: [],
    srs: {},
    exams: [],
    attempts: [],
    theme: 'system',
  };
}

describe('analyzeWeakSpots', () => {
  it('flags an area below the bar with enough attempts as weak, keeps mastered ones ok', () => {
    const state = baseState();
    state.questionStats = {
      q1: { id: 'q1', domain: 'arch', attempts: 6, correct: 1, lastCorrect: false, lastSeen: NOW },
      q2: { id: 'q2', domain: 'ctx', attempts: 4, correct: 4, lastCorrect: true, lastSeen: NOW },
    };
    const areas = analyzeWeakSpots(state, NOW);

    const archDomain = areas.find((a) => a.kind === 'domain' && a.key === 'arch');
    const ctxDomain = areas.find((a) => a.kind === 'domain' && a.key === 'ctx');
    expect(archDomain?.status).toBe('weak');
    expect(archDomain?.scaled).toBe(250); // 1/6 on the 100–1000 scale
    expect(ctxDomain?.status).toBe('ok');
  });

  it('computes a rolling trend and delta from the attempt log', () => {
    const state = baseState();
    state.questionStats = {
      q1: { id: 'q1', domain: 'arch', attempts: 6, correct: 3, lastCorrect: true, lastSeen: NOW },
    };
    // Chronological: three misses then three hits → clearly improving.
    state.attempts = [false, false, false, true, true, true].map((correct, i) => ({
      id: 'q1',
      ts: NOW + i,
      correct,
      usedHint: false,
      mode: 'study' as const,
    }));
    const arch = analyzeWeakSpots(state, NOW).find((a) => a.kind === 'domain' && a.key === 'arch');
    expect(arch?.trend).toEqual([0, 0, 0, 1, 1, 1]);
    expect(arch?.delta).toBe(1);
  });

  it('excludes supplementary questions from every mastery dimension', () => {
    const state = baseState();
    state.questionStats = {
      // q3 is off-blueprint and answered perfectly; q1 shares its principle and
      // q3 shares q1's scenario set, so a leak would show up on all three lenses.
      q3: { id: 'q3', domain: 'mcp', attempts: 8, correct: 8, lastCorrect: true, lastSeen: NOW },
      q1: { id: 'q1', domain: 'arch', attempts: 4, correct: 0, lastCorrect: false, lastSeen: NOW },
    };
    const areas = analyzeWeakSpots(state, NOW);

    expect(areas.some((a) => a.kind === 'domain' && a.key === 'mcp')).toBe(false);
    // The shared principle and scenario set reflect q1 alone, not q1 + q3.
    const principle = areas.find((a) => a.kind === 'principle' && a.key === 'constrain-dont-add');
    const set = areas.find((a) => a.kind === 'scenarioSet' && a.key === 'support-agent');
    expect(principle?.attempts).toBe(4);
    expect(set?.attempts).toBe(4);
  });
});

describe('topWeakSpots', () => {
  it('returns nothing without enough practice', () => {
    expect(topWeakSpots(baseState(), 5, NOW)).toHaveLength(0);
  });

  it('surfaces only actionable weak areas and ranks domain/principle above scenario sets', () => {
    const state = baseState();
    state.questionStats = {
      q1: { id: 'q1', domain: 'arch', attempts: 6, correct: 1, lastCorrect: false, lastSeen: NOW },
      q2: { id: 'q2', domain: 'ctx', attempts: 4, correct: 4, lastCorrect: true, lastSeen: NOW },
    };
    const top = topWeakSpots(state, 5, NOW);
    // arch surfaces across all three lenses; the mastered ctx never does.
    expect(top).toHaveLength(3);
    expect(top.every((a) => a.status !== 'ok')).toBe(true);
    expect(top.some((a) => a.kind === 'scenarioSet')).toBe(true);
    // The scenario-set lens is de-prioritised below domain/principle.
    expect(top[top.length - 1].kind).toBe('scenarioSet');
  });
});

describe('storage migration', () => {
  it('upgrades a v1 blob to v2 with an empty attempt log, preserving data', () => {
    const migrated = migrate({
      version: 1,
      questionStats: { a: { id: 'a', domain: 'pe', attempts: 2, correct: 1, lastCorrect: true, lastSeen: 5 } },
      missed: ['a'],
      theme: 'dark',
    });
    expect(migrated.version).toBe(STATE_VERSION);
    expect(migrated.attempts).toEqual([]);
    expect(migrated.missed).toEqual(['a']);
    expect(migrated.theme).toBe('dark');
    expect(migrated.questionStats.a.correct).toBe(1);
  });

  it('fills defaults for an empty/corrupt-shaped blob', () => {
    const migrated = migrate({});
    expect(migrated.version).toBe(STATE_VERSION);
    expect(migrated.attempts).toEqual([]);
    expect(migrated.exams).toEqual([]);
    expect(migrated.theme).toBe('system');
  });

  it('leaves an existing v2 attempt log intact', () => {
    const attempts = [{ id: 'x', ts: 1, correct: true, usedHint: false, mode: 'exam' as const }];
    const migrated = migrate({ version: 2, attempts });
    expect(migrated.attempts).toEqual(attempts);
  });

  it('upgrades a v2 blob to v3 with empty module progress, preserving history', () => {
    const attempts = [{ id: 'x', ts: 1, correct: true, usedHint: false, mode: 'study' as const }];
    const migrated = migrate({ version: 2, attempts, missed: ['x'] });
    expect(migrated.version).toBe(STATE_VERSION);
    expect(migrated.modules).toEqual({});
    expect(migrated.attempts).toEqual(attempts);
    expect(migrated.missed).toEqual(['x']);
  });

  it('leaves existing module progress intact', () => {
    const modules = {
      m1: { id: 'm1', startedAt: 1, lastStepId: 's2', steps: {} },
    };
    const migrated = migrate({ version: 3, modules });
    expect(migrated.modules).toEqual(modules);
  });
});

describe('learning-module steps', () => {
  function withModules(steps: Record<string, Record<string, { correct: boolean | null; attempts: number }>>): AppState {
    const state = baseState();
    state.modules = Object.fromEntries(
      Object.entries(steps).map(([moduleId, byStep]) => [
        moduleId,
        {
          id: moduleId,
          startedAt: NOW,
          lastStepId: Object.keys(byStep)[0],
          steps: Object.fromEntries(
            Object.entries(byStep).map(([stepId, o]) => [
              stepId,
              { correct: o.correct, attempts: o.attempts, usedHint: false, ts: NOW },
            ]),
          ),
        },
      ]),
    );
    return state;
  }

  it('counts a graded step toward its module domain and its step principle', () => {
    const state = withModules({ m1: { s1: { correct: false, attempts: 3 } } });
    state.attempts = [{ id: stepKey('m1', 's1'), ts: NOW, correct: false, usedHint: false, mode: 'module' }];

    const areas = analyzeWeakSpots(state, NOW);
    const domain = areas.find((a) => a.kind === 'domain' && a.key === 'arch');
    expect(domain).toBeDefined();
    expect(domain?.attempts).toBe(3);
    expect(domain?.correct).toBe(0);
    expect(domain?.status).toBe('weak');
    expect(areas.some((a) => a.kind === 'principle' && a.key === 'constrain-dont-add')).toBe(true);
    // Exactly one declared scenario set, so the outcome is attributable.
    expect(areas.some((a) => a.kind === 'scenarioSet' && a.key === 'support-agent')).toBe(true);
  });

  it('ignores ungraded teach steps entirely', () => {
    const state = withModules({ m1: { s1: { correct: null, attempts: 1 } } });
    expect(analyzeWeakSpots(state, NOW)).toHaveLength(0);
  });

  it('ignores quiz steps, which are already counted under their question id', () => {
    const state = withModules({ m1: { s2: { correct: false, attempts: 2 } } });
    expect(analyzeWeakSpots(state, NOW)).toHaveLength(0);
  });

  it('excludes supplementary modules from mastery, as it does supplementary questions', () => {
    const state = withModules({ m2: { s1: { correct: false, attempts: 4 } } });
    expect(analyzeWeakSpots(state, NOW)).toHaveLength(0);
  });
});
