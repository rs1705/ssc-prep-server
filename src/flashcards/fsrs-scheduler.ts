import { Card, FSRS } from 'fsrs.js';

export type Rating = 1 | 2 | 3 | 4;

/** FSRS state as stored in the `FsrsData` table. */
export interface StoredFsrsState {
  dueDate: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: Date;
}

const scheduler = new FSRS();

/**
 * Pure function: given a card's current state (null = never reviewed) and a
 * rating, return the next state. No I/O, so it is trivial to unit test.
 */
export function scheduleReview(
  current: StoredFsrsState | null,
  rating: Rating,
  now: Date = new Date(),
): StoredFsrsState {
  const card = new Card();
  if (current) {
    card.due = current.dueDate;
    card.stability = current.stability;
    card.difficulty = current.difficulty;
    card.elapsed_days = current.elapsedDays;
    card.scheduled_days = current.scheduledDays;
    card.reps = current.reps;
    card.lapses = current.lapses;
    card.state = current.state;
    card.last_review = current.lastReview;
  }

  const next = scheduler.repeat(card, now)[rating].card;
  return {
    dueDate: next.due,
    stability: next.stability,
    difficulty: next.difficulty,
    elapsedDays: next.elapsed_days,
    scheduledDays: next.scheduled_days,
    reps: next.reps,
    lapses: next.lapses,
    state: next.state,
    lastReview: now,
  };
}

/** Due date for each possible rating, keyed "1".."4" (ISO strings). */
export type ReviewPreview = Record<'1' | '2' | '3' | '4', string>;

/**
 * What would happen for each rating, without saving anything. Lets the client
 * show real intervals ("10 min", "3 d") on the rating buttons.
 */
export function previewReview(
  current: StoredFsrsState | null,
  now: Date = new Date(),
): ReviewPreview {
  const preview = {} as ReviewPreview;
  for (const rating of [1, 2, 3, 4] as const) {
    preview[String(rating) as keyof ReviewPreview] = scheduleReview(
      current,
      rating,
      now,
    ).dueDate.toISOString();
  }
  return preview;
}
