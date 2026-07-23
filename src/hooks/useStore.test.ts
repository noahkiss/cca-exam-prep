// recordStep's persistence contract. The interesting part is which steps earn an
// SM-2 card: a graded classify/order step does, a `teach` step never (it has no
// verdict), and a `quiz` step never (it is already scheduled under the real
// question id by recordAnswer, and scheduling it twice would drill the same
// material on two independent clocks).

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Controlled module set so these tests don't depend on data/modules.json.
// useStore imports only MODULE_BY_ID and stepKey from here.
vi.mock('@/lib/modules', () => ({
  stepKey: (moduleId: string, stepId: string) => `mod:${moduleId}:${stepId}`,
  MODULE_BY_ID: {
    m1: {
      id: 'm1',
      steps: [
        { id: 'read', type: 'teach' },
        { id: 'sort', type: 'classify' },
        { id: 'seq', type: 'order' },
        { id: 'check', type: 'quiz' },
      ],
    },
  },
}));

import { recordStep, clearAllProgress } from './useStore';
import { loadState } from '@/lib/storage';

beforeEach(() => {
  clearAllProgress();
});

describe('recordStep SM-2', () => {
  it('opens a card for a graded classify or order step', () => {
    recordStep({ moduleId: 'm1', stepId: 'sort', correct: true, usedHint: false });
    recordStep({ moduleId: 'm1', stepId: 'seq', correct: false, usedHint: false });
    const { srs } = loadState();

    expect(srs['mod:m1:sort']).toMatchObject({ id: 'mod:m1:sort', reps: 1, interval: 1 });
    // A miss is a lapse: no streak, back within the day.
    expect(srs['mod:m1:seq']).toMatchObject({ id: 'mod:m1:seq', reps: 0, interval: 0 });
  });

  it('opens no card for an ungraded teach step or for a quiz step', () => {
    recordStep({ moduleId: 'm1', stepId: 'read', correct: null, usedHint: false });
    recordStep({ moduleId: 'm1', stepId: 'check', correct: true, usedHint: false });
    expect(loadState().srs).toEqual({});
  });

  it('advances an existing card rather than restarting it', () => {
    recordStep({ moduleId: 'm1', stepId: 'sort', correct: true, usedHint: false });
    recordStep({ moduleId: 'm1', stepId: 'sort', correct: true, usedHint: false });
    const card = loadState().srs['mod:m1:sort'];
    expect(card.reps).toBe(2);
    expect(card.interval).toBe(6);
  });

  it('grades a hinted answer lower than a clean one', () => {
    recordStep({ moduleId: 'm1', stepId: 'sort', correct: true, usedHint: true });
    recordStep({ moduleId: 'm1', stepId: 'seq', correct: true, usedHint: false });
    const { srs } = loadState();
    expect(srs['mod:m1:sort'].ease).toBeLessThan(srs['mod:m1:seq'].ease);
  });

  it('keeps step keys out of the question-only stores', () => {
    recordStep({ moduleId: 'm1', stepId: 'sort', correct: false, usedHint: false });
    const s = loadState();
    expect(s.missed).toEqual([]);
    expect(s.questionStats).toEqual({});
  });
});

describe('recordStep attempt log', () => {
  it('defaults to module mode and honours an explicit one', () => {
    recordStep({ moduleId: 'm1', stepId: 'sort', correct: true, usedHint: false });
    recordStep({ moduleId: 'm1', stepId: 'seq', correct: true, usedHint: false, mode: 'review' });
    const modes = loadState().attempts.map((a) => [a.id, a.mode]);
    expect(modes).toEqual([
      ['mod:m1:sort', 'module'],
      ['mod:m1:seq', 'review'],
    ]);
  });
});
