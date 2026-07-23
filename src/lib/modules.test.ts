// Grading must stay deterministic and strict — these tests are the guard on
// that contract, not just coverage.

import { describe, it, expect } from 'vitest';
import { gradeClassify, gradeOrder, stepKey } from './modules';
import type { ClassifyStep, OrderStep } from '@/types';

const classify: ClassifyStep = {
  id: 's1',
  title: 'Categorise the failures',
  type: 'classify',
  prompt: 'Sort each error.',
  buckets: [
    { id: 'transient', label: 'Transient' },
    { id: 'validation', label: 'Validation' },
  ],
  items: [
    { id: 'i1', text: 'Upstream 503', bucket: 'transient', why: 'Retrying can succeed.' },
    { id: 'i2', text: 'Missing required field', bucket: 'validation', why: 'Retrying cannot help.' },
  ],
};

const order: OrderStep = {
  id: 's2',
  title: 'Order the loop',
  type: 'order',
  prompt: 'Put the stages in order.',
  items: [
    { id: 'a', label: 'Send request' },
    { id: 'b', label: 'Execute tool' },
    { id: 'c', label: 'Return result' },
  ],
  correctOrder: ['a', 'b', 'c'],
  why: { a: 'first', b: 'second', c: 'third' },
};

describe('gradeClassify', () => {
  it('passes only when every item is in its keyed bucket', () => {
    expect(gradeClassify(classify, { i1: 'transient', i2: 'validation' })).toBe(true);
  });

  it('treats a partially correct placement as a miss', () => {
    expect(gradeClassify(classify, { i1: 'transient', i2: 'transient' })).toBe(false);
  });

  it('fails an incomplete placement rather than ignoring the gap', () => {
    expect(gradeClassify(classify, { i1: 'transient' })).toBe(false);
    expect(gradeClassify(classify, {})).toBe(false);
  });
});

describe('gradeOrder', () => {
  it('accepts the keyed sequence', () => {
    expect(gradeOrder(order, ['a', 'b', 'c'])).toBe(true);
  });

  it('rejects a wrong sequence and a short one', () => {
    expect(gradeOrder(order, ['b', 'a', 'c'])).toBe(false);
    expect(gradeOrder(order, ['a', 'b'])).toBe(false);
  });

  it('accepts a declared alternate for commutative stages, and nothing else', () => {
    const commutative: OrderStep = { ...order, acceptableOrders: [['b', 'a', 'c']] };
    expect(gradeOrder(commutative, ['b', 'a', 'c'])).toBe(true);
    expect(gradeOrder(commutative, ['a', 'b', 'c'])).toBe(true);
    expect(gradeOrder(commutative, ['c', 'b', 'a'])).toBe(false);
  });
});

describe('stepKey', () => {
  it('namespaces module steps so they cannot collide with a question id', () => {
    expect(stepKey('arch-agentic-loop', 's1')).toBe('mod:arch-agentic-loop:s1');
  });
});
