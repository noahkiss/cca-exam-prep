// SM-2 spaced-repetition scheduling (SuperMemo 2). We map a binary
// correct/incorrect drill outcome onto SM-2's 0–5 quality grade, then update
// each card's ease factor, interval, and due date. State is persisted per
// question id in localStorage (see storage.ts).

export interface SrsCard {
  /** Question id. */
  id: string;
  /** Ease factor (SM-2 EF), min 1.3. */
  ease: number;
  /** Current interval in days. */
  interval: number;
  /** Number of consecutive successful reviews. */
  reps: number;
  /** Epoch ms when the card is next due. */
  due: number;
  /** Epoch ms of the last review. */
  lastReviewed: number;
}

const MIN_EASE = 1.3;
const DAY_MS = 24 * 60 * 60 * 1000;

export function newCard(id: string, now = Date.now()): SrsCard {
  return { id, ease: 2.5, interval: 0, reps: 0, due: now, lastReviewed: 0 };
}

/**
 * Map a drill result to an SM-2 quality grade (0–5).
 * - incorrect → 2 (a lapse: reps reset, card comes back same day)
 * - correct   → 4 by default; 5 if the user answered without revealing a hint
 *   (a cleaner recall earns a longer interval).
 */
export function qualityFor(correct: boolean, usedHint: boolean): number {
  if (!correct) return 2;
  return usedHint ? 4 : 5;
}

/** Apply one SM-2 review to a card, returning the updated card. */
export function review(card: SrsCard, quality: number, now = Date.now()): SrsCard {
  const q = Math.max(0, Math.min(5, quality));

  let { ease, interval, reps } = card;

  if (q < 3) {
    // Lapse: reset the streak, re-show soon (same day).
    reps = 0;
    interval = 0;
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(interval * ease);

    // SM-2 ease update.
    ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (ease < MIN_EASE) ease = MIN_EASE;
  }

  const due = interval === 0 ? now + 10 * 60 * 1000 : now + interval * DAY_MS;

  return { id: card.id, ease, interval, reps, due, lastReviewed: now };
}

/** Cards whose due date has passed, soonest first. */
export function dueCards(cards: SrsCard[], now = Date.now()): SrsCard[] {
  return cards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due);
}
