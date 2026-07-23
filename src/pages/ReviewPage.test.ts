// The review queue mixes two id namespaces — bank question ids and
// `mod:<module>:<step>` keys — and a stored SM-2 card can outlive the content it
// points at. resolveCard is the single place that decides what a card id means,
// so it is what these tests pin: it must never throw, and it must drop anything
// this page cannot actually render.

import { describe, it, expect } from 'vitest';
import { resolveCard } from './ReviewPage';
import { MODULES, stepKey } from '@/lib/modules';
import { QUESTIONS } from '@/lib/questions';
import { dueCards, newCard, type SrsCard } from '@/lib/srs';
import type { ModuleStep } from '@/types';

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

/** First step of a given type anywhere in the real content, with its key. */
function firstStepOfType(type: ModuleStep['type']): string {
  for (const m of MODULES) {
    const step = m.steps.find((s) => s.type === type);
    if (step) return stepKey(m.id, step.id);
  }
  throw new Error(`no ${type} step in data/modules.json — fixture assumption broken`);
}

const questionId = QUESTIONS[0].id;
const classifyKey = firstStepOfType('classify');
const orderKey = firstStepOfType('order');
const teachKey = firstStepOfType('teach');
const quizKey = firstStepOfType('quiz');

describe('resolveCard', () => {
  it('resolves a bank question id', () => {
    expect(resolveCard(questionId)).toMatchObject({ kind: 'question' });
  });

  it('resolves classify and order step keys, carrying the owning module', () => {
    for (const key of [classifyKey, orderKey]) {
      const card = resolveCard(key);
      expect(card?.kind).toBe('step');
      if (card?.kind !== 'step') throw new Error('unreachable');
      expect(card.module.title.length).toBeGreaterThan(0);
      expect(key).toBe(stepKey(card.module.id, card.step.id));
    }
  });

  it('refuses step types this page cannot render', () => {
    // teach is ungraded and never earns a card; quiz is scheduled under its
    // question id. Either one appearing here would be a stale card.
    expect(resolveCard(teachKey)).toBeUndefined();
    expect(resolveCard(quizKey)).toBeUndefined();
  });

  it('returns undefined for ids that resolve nowhere', () => {
    expect(resolveCard('mod:no-such-module:no-such-step')).toBeUndefined();
    expect(resolveCard('q-does-not-exist')).toBeUndefined();
    expect(resolveCard('')).toBeUndefined();
  });
});

describe('due queue filtering', () => {
  const card = (id: string, due: number): SrsCard => ({ ...newCard(id, NOW), due });

  it('keeps resolvable ids of either namespace and drops the rest', () => {
    const cards = [
      card(questionId, NOW - DAY),
      card(classifyKey, NOW - 2 * DAY),
      card(orderKey, NOW - DAY),
      card('mod:deleted-module:gone', NOW - DAY),
      card('q-retired', NOW - DAY),
      card(quizKey, NOW - DAY),
    ];

    const ids = dueCards(cards, NOW)
      .map((c) => c.id)
      .filter((id) => resolveCard(id) !== undefined);

    // Soonest-due first, so the classify card leads.
    expect(ids).toEqual([classifyKey, questionId, orderKey]);
  });

  it('leaves a module step that is not yet due out of the queue', () => {
    const ids = dueCards([card(classifyKey, NOW + DAY)], NOW)
      .map((c) => c.id)
      .filter((id) => resolveCard(id) !== undefined);
    expect(ids).toEqual([]);
  });
});
