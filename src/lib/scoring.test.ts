import { describe, it, expect } from 'vitest';
import { gradeAttempt, toScaled, PASS_THRESHOLD, MIN_SCORE, type GradedItem } from './scoring';
import { review, newCard, qualityFor } from './srs';
import { seededPermutation } from './rng';
import type { Question } from '@/types';

function q(id: string, domain: Question['domain'], answer = 0): Question {
  return {
    id,
    domain,
    scenario: 's',
    question: 'q',
    options: ['a', 'b', 'c', 'd'],
    answer,
    hint: 'h',
    explanation: 'e',
    eliminationRule: 'r',
    tip: 't',
    principle: 'constrain-dont-add',
  };
}

describe('toScaled', () => {
  it('maps proportion onto the 100-1000 scale', () => {
    // The scale has a floor of 100 — a zero-correct paper still reports 100.
    expect(toScaled(0, 10)).toBe(MIN_SCORE);
    expect(toScaled(10, 10)).toBe(1000);
    expect(toScaled(5, 10)).toBe(550);
  });
  it('puts the 720 pass mark at ~68.9% raw, not 72%', () => {
    expect(toScaled(69, 100)).toBeGreaterThanOrEqual(PASS_THRESHOLD);
    expect(toScaled(68, 100)).toBeLessThan(PASS_THRESHOLD);
  });
  it('guards divide-by-zero', () => {
    expect(toScaled(0, 0)).toBe(MIN_SCORE);
  });
});

describe('gradeAttempt strict pass', () => {
  it('fails when one domain is below bar despite a high average', () => {
    const items: GradedItem[] = [
      // arch: 5/5 correct
      ...Array.from({ length: 5 }, (_, i) => ({ question: q(`arch-${i}`, 'arch'), chosen: 0 })),
      // ctx: 0/2 correct → domain scaled 0
      { question: q('ctx-0', 'ctx'), chosen: 1 },
      { question: q('ctx-1', 'ctx'), chosen: 1 },
    ];
    const res = gradeAttempt(items);
    expect(res.scaled).toBe(toScaled(5, 7)); // 743 — clears the bar on the total
    expect(res.passedStrict).toBe(false);
    expect(res.weakDomains).toContain('ctx');
    // The real exam gates on the total ALONE, so the exam verdict still passes
    // here. passedStrict is our stricter study view, not an exam rule.
    expect(res.overallPassed).toBe(true);
  });

  it('passes only when every represented domain clears the bar', () => {
    const items: GradedItem[] = [
      ...Array.from({ length: 8 }, (_, i) => ({ question: q(`arch-${i}`, 'arch'), chosen: 0 })),
      ...Array.from({ length: 8 }, (_, i) => ({ question: q(`pe-${i}`, 'pe'), chosen: 0 })),
    ];
    const res = gradeAttempt(items);
    expect(res.scaled).toBe(1000);
    expect(res.passedStrict).toBe(true);
    expect(res.weakDomains).toHaveLength(0);
  });

  it('counts unanswered as wrong', () => {
    const items: GradedItem[] = [
      { question: q('a', 'arch'), chosen: 0 },
      { question: q('b', 'arch'), chosen: null },
    ];
    const res = gradeAttempt(items);
    expect(res.correct).toBe(1);
    expect(res.answered).toBe(1);
    expect(res.total).toBe(2);
  });
});

describe('seededPermutation', () => {
  it('is deterministic for a seed and a valid permutation', () => {
    const a = seededPermutation(4, 'x');
    const b = seededPermutation(4, 'x');
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([0, 1, 2, 3]);
  });
  it('varies across seeds', () => {
    const a = seededPermutation(6, 'attempt-1').join('');
    const b = seededPermutation(6, 'attempt-2').join('');
    expect(a).not.toBe(b);
  });
});

describe('SM-2', () => {
  it('lengthens interval on repeated clean recalls', () => {
    let card = newCard('x', 0);
    card = review(card, qualityFor(true, false), 0);
    expect(card.interval).toBe(1);
    card = review(card, qualityFor(true, false), 0);
    expect(card.interval).toBe(6);
    card = review(card, qualityFor(true, false), 0);
    expect(card.interval).toBeGreaterThan(6);
  });
  it('resets on a lapse', () => {
    let card = newCard('x', 0);
    card = review(card, 5, 0);
    card = review(card, 5, 0);
    card = review(card, qualityFor(false, false), 0);
    expect(card.reps).toBe(0);
    expect(card.interval).toBe(0);
    expect(card.ease).toBeGreaterThanOrEqual(1.3);
  });
});

// Sanity: PASS_THRESHOLD is the documented 720.
it('pass threshold is 720', () => {
  expect(PASS_THRESHOLD).toBe(720);
});
