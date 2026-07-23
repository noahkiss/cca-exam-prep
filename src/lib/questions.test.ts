// Guards the scope split against the real bank. `QUESTIONS` is what exam mode,
// scoring and mastery all draw from, so a supplementary question leaking into
// it is the failure this whole flag exists to prevent.

import { describe, it, expect } from 'vitest';
import {
  ALL_QUESTIONS,
  QUESTIONS,
  QUESTIONS_BY_ID,
  SUPPLEMENTARY_QUESTIONS,
  questionsByDomain,
} from './questions';
import { EXAM_SIZE, sampleExam } from './sampling';

describe('exam scope', () => {
  it('keeps supplementary questions out of the exam bank', () => {
    expect(QUESTIONS.every((q) => q.examScope !== 'supplementary')).toBe(true);
    expect(SUPPLEMENTARY_QUESTIONS.every((q) => q.examScope === 'supplementary')).toBe(true);
    expect(QUESTIONS.length + SUPPLEMENTARY_QUESTIONS.length).toBe(ALL_QUESTIONS.length);
  });

  it('resolves supplementary ids by id so stored attempts still render', () => {
    for (const q of SUPPLEMENTARY_QUESTIONS) {
      expect(QUESTIONS_BY_ID[q.id]).toBeDefined();
    }
  });

  it('never samples a supplementary question into an exam', () => {
    // Several seeds: sampling is 4-of-6 by scenario set, so one draw wouldn't
    // cover the sets a supplementary question happens to be tagged with.
    for (let i = 0; i < 25; i++) {
      const paper = sampleExam(QUESTIONS, `scope-test-${i}`);
      expect(paper.every((q) => q.examScope !== 'supplementary')).toBe(true);
    }
  });

  it('still fills a full-length exam from the blueprint bank alone', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(EXAM_SIZE);
    expect(sampleExam(QUESTIONS, 'length-check')).toHaveLength(EXAM_SIZE);
  });

  it('excludes supplementary questions from per-domain study pools', () => {
    for (const q of SUPPLEMENTARY_QUESTIONS) {
      expect(questionsByDomain(q.domain).some((x) => x.id === q.id)).toBe(false);
    }
  });
});
