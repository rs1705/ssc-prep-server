import {
  emptyDoc,
  LIMITS,
  mergeDocs,
  normalizeDoc,
  type ProgressDoc,
} from './merge';

const doc = (patch: Partial<ProgressDoc>): ProgressDoc => ({
  ...emptyDoc(),
  ...patch,
});
const mistake = (prompt: string, at: number, rightDays: string[] = []) => ({
  id: `${prompt}-${at}`,
  prompt,
  at,
  answer: 'x',
  rightDays,
});

describe('mergeDocs', () => {
  it('combines history from two devices without duplicates, newest first', () => {
    const a = doc({
      activities: [
        { id: '1', at: 10 },
        { id: '2', at: 30 },
      ],
    });
    const b = doc({
      activities: [
        { id: '2', at: 30 },
        { id: '3', at: 20 },
      ],
    });
    expect(mergeDocs(a, b).activities.map((x) => x.id)).toEqual([
      '2',
      '3',
      '1',
    ]);
  });

  it('caps history', () => {
    const many = Array.from({ length: LIMITS.activities + 20 }, (_, i) => ({
      id: String(i),
      at: i,
    }));
    expect(
      mergeDocs(doc({ activities: many }), emptyDoc()).activities,
    ).toHaveLength(LIMITS.activities);
  });

  it('keeps review progress from both copies of the same mistake', () => {
    const a = doc({ mistakes: [mistake('q', 5, ['2026-11-10'])] });
    const b = doc({ mistakes: [mistake('q', 5, ['2026-11-11'])] });
    expect(mergeDocs(a, b).mistakes[0].rightDays).toEqual([
      '2026-11-10',
      '2026-11-11',
    ]);
  });

  it('a removal (dismissed or mastered) wins over an older copy, not a newer one', () => {
    const removed = doc({ mistakesRemoved: [{ prompt: 'q', at: 10 }] });
    expect(
      mergeDocs(removed, doc({ mistakes: [mistake('q', 5)] })).mistakes,
    ).toHaveLength(0);
    // Got it wrong again later: it comes back.
    expect(
      mergeDocs(removed, doc({ mistakes: [mistake('q', 20)] })).mistakes,
    ).toHaveLength(1);
  });

  it('takes the higher plan count per day and step', () => {
    const a = doc({ plan: { '2026-11-12': { cards: 4, drill: 1 } } });
    const b = doc({
      plan: { '2026-11-12': { cards: 7 }, '2026-11-11': { game: 1 } },
    });
    expect(mergeDocs(a, b).plan).toEqual({
      '2026-11-12': { cards: 7, drill: 1 },
      '2026-11-11': { game: 1 },
    });
  });

  it('keeps the streak with the later day, or the higher count on the same day', () => {
    expect(
      mergeDocs(
        doc({ planStreak: { last: '2026-11-12', count: 2 } }),
        doc({ planStreak: { last: '2026-11-11', count: 9 } }),
      ).planStreak,
    ).toEqual({ last: '2026-11-12', count: 2 });
    expect(
      mergeDocs(
        doc({ planStreak: { last: '2026-11-12', count: 2 } }),
        doc({ planStreak: { last: '2026-11-12', count: 3 } }),
      ).planStreak.count,
    ).toBe(3);
  });

  it('keeps the newer unfinished session and honours a newer removal', () => {
    const a = doc({ unfinished: { '/p': { path: '/p', at: 5, done: 2 } } });
    const b = doc({ unfinished: { '/p': { path: '/p', at: 9, done: 6 } } });
    expect(mergeDocs(a, b).unfinished['/p'].done).toBe(6);
    expect(
      mergeDocs(b, doc({ unfinishedRemoved: [{ path: '/p', at: 10 }] }))
        .unfinished,
    ).toEqual({});
  });

  it('takes the newer exam date', () => {
    const merged = mergeDocs(
      doc({ examDate: { value: '2027-02-01', at: 5 } }),
      doc({ examDate: { value: '2027-03-01', at: 9 } }),
    );
    expect(merged.examDate.value).toBe('2027-03-01');
  });

  it('gives the same result whichever copy comes first, and merging twice changes nothing', () => {
    const a = doc({
      activities: [{ id: '1', at: 1 }],
      mistakes: [mistake('q', 3)],
      plan: { '2026-11-12': { pyq: 1 } },
    });
    const b = doc({
      activities: [{ id: '2', at: 2 }],
      mistakesRemoved: [{ prompt: 'z', at: 1 }],
      planStreak: { last: '2026-11-12', count: 1 },
    });
    const ab = mergeDocs(a, b);
    expect(mergeDocs(b, a)).toEqual(ab);
    expect(mergeDocs(ab, ab)).toEqual(ab);
  });
});

describe('normalizeDoc', () => {
  it('drops malformed input instead of storing it', () => {
    const d = normalizeDoc({
      activities: [{ id: 1 }, 'x', { id: 'ok', at: 1 }],
      plan: { 'not-a-day': { a: 1 } },
      examDate: { value: 'soon' },
    });
    expect(d.activities).toEqual([{ id: 'ok', at: 1 }]);
    expect(d.plan).toEqual({});
    expect(d.examDate.value).toBeNull();
    expect(normalizeDoc(null)).toEqual(emptyDoc());
  });
});

describe('seen pools', () => {
  it('unions the same cycle and lets a later cycle win', () => {
    const a = doc({
      seen: {
        hangman: { cycle: 1, ids: ['a', 'b'] },
        wordle: { cycle: 2, ids: ['x'] },
      },
    });
    const b = doc({
      seen: {
        hangman: { cycle: 1, ids: ['b', 'c'] },
        wordle: { cycle: 1, ids: ['y', 'z'] },
      },
    });
    const out = mergeDocs(a, b);
    expect(out.seen.hangman).toEqual({ cycle: 1, ids: ['a', 'b', 'c'] });
    expect(out.seen.wordle).toEqual({ cycle: 2, ids: ['x'] });
  });

  it('drops malformed entries', () => {
    const d = normalizeDoc({
      seen: { ok: { cycle: 1, ids: ['a', 3] }, bad: 'nope' },
    });
    expect(d.seen.ok).toEqual({ cycle: 1, ids: ['a'] });
    expect(d.seen.bad).toEqual({ cycle: 0, ids: [] });
  });
});

describe('attempts', () => {
  const attempt = (id: string, at: number) => ({
    id,
    at,
    kind: 'section' as const,
    title: 'SSC CGL Tier 1 · 2025 · Quant',
    paperId: 'p1',
    subject: 'maths',
    sections: [{ subject: 'maths', ids: ['q1', 'q2'] }],
    answers: { q1: 'A' },
    marks: 2,
    maxMarks: 4,
    correct: 1,
    wrong: 0,
  });

  it('keeps attempts from both devices once, newest first', () => {
    const out = mergeDocs(
      doc({ attempts: [attempt('a', 10), attempt('b', 30)] }),
      doc({ attempts: [attempt('b', 30), attempt('c', 20)] }),
    );
    expect(out.attempts.map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  it('drops malformed attempts and bad answers', () => {
    const d = normalizeDoc({
      attempts: [
        { ...attempt('ok', 1), answers: { q1: 'A', q2: 'TOO-LONG', q3: 4 } },
        { ...attempt('nokind', 2), kind: 'quiz' },
        { ...attempt('nosections', 3), sections: [] },
        'junk',
      ],
    });
    expect(d.attempts.map((x) => x.id)).toEqual(['ok']);
    expect(d.attempts[0].answers).toEqual({ q1: 'A' });
  });

  it('keeps at most the newest LIMITS.attempts', () => {
    const many = Array.from({ length: LIMITS.attempts + 5 }, (_, i) =>
      attempt(`a${i}`, i),
    );
    const out = mergeDocs(doc({ attempts: many }), doc({}));
    expect(out.attempts).toHaveLength(LIMITS.attempts);
    expect(out.attempts[0].id).toBe(`a${LIMITS.attempts + 4}`);
  });
});
