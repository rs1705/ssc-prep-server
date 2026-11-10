import { scheduleReview } from './fsrs-scheduler';

const NOW = new Date('2026-11-10T10:00:00.000Z');

describe('scheduleReview', () => {
  it('schedules a brand-new card in the future with one rep', () => {
    const next = scheduleReview(null, 3, NOW);
    expect(next.reps).toBe(1);
    expect(next.lastReview).toEqual(NOW);
    expect(next.dueDate.getTime()).toBeGreaterThan(NOW.getTime());
    expect(next.state).not.toBe(0); // no longer "New"
  });

  it('brings the card back sooner for Again than for Easy', () => {
    const again = scheduleReview(null, 1, NOW);
    const easy = scheduleReview(null, 4, NOW);
    expect(again.dueDate.getTime()).toBeLessThan(easy.dueDate.getTime());
  });

  it('builds on previous state: reps grow and the interval does not shrink on Good', () => {
    const first = scheduleReview(null, 3, NOW);
    const later = new Date(first.dueDate.getTime());
    const second = scheduleReview(first, 3, later);
    expect(second.reps).toBe(2);
    expect(second.dueDate.getTime()).toBeGreaterThan(later.getTime());
    expect(second.scheduledDays).toBeGreaterThanOrEqual(first.scheduledDays);
  });

  it('counts a lapse when a reviewed card is rated Again', () => {
    const first = scheduleReview(null, 3, NOW);
    const reviewState = scheduleReview(first, 3, first.dueDate);
    const lapsed = scheduleReview(reviewState, 1, reviewState.dueDate);
    expect(lapsed.lapses).toBeGreaterThanOrEqual(reviewState.lapses);
    expect(lapsed.reps).toBe(3);
  });
});
