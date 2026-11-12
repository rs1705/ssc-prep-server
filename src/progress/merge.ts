/**
 * Merging two copies of a user's practice progress (e.g. the server's and a
 * phone's). Every rule only ever combines, so syncing in any order, any number
 * of times, from any number of devices converges on the same result:
 *
 *  - activities:  union by id, newest first, capped.
 *  - mistakes:    union by prompt; the newer copy wins, and review progress
 *                 (rightDays) from both is kept. A removal (dismissed or
 *                 mastered) wins over any copy that isn't newer than it.
 *  - mastered:    union of the times mistakes were mastered.
 *  - plan:        per day and step, the higher count.
 *  - planStreak:  the one with the later day; on the same day, the higher count.
 *  - unfinished:  per screen, the newer session; a newer removal deletes it.
 *  - examDate:    the newer value.
 *  - seen:        per game pool, the later cycle; within a cycle, the union.
 */

export interface Activity {
  id: string;
  at: number;
  [key: string]: unknown;
}

export interface Mistake {
  id: string;
  at: number;
  prompt: string;
  rightDays?: string[];
  [key: string]: unknown;
}

export interface Unfinished {
  at: number;
  path: string;
  [key: string]: unknown;
}

export interface ProgressDoc {
  version: 1;
  activities: Activity[];
  mistakes: Mistake[];
  /** Mistake prompts removed by the user or by mastery, with when. */
  mistakesRemoved: { prompt: string; at: number }[];
  mastered: number[];
  /** "YYYY-MM-DD" -> step -> count. */
  plan: Record<string, Record<string, number>>;
  planStreak: { last: string | null; count: number };
  unfinished: Record<string, Unfinished>;
  unfinishedRemoved: { path: string; at: number }[];
  examDate: { value: string | null; at: number };
  /** Game pool -> words shown this cycle (oldest first). */
  seen: Record<string, { cycle: number; ids: string[] }>;
}

export const LIMITS = {
  activities: 300,
  mistakes: 150,
  mistakesRemoved: 1000,
  mastered: 500,
  planDays: 60,
  unfinished: 20,
  unfinishedRemoved: 200,
  seenPools: 50,
  seenIds: 3000,
};

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

export function emptyDoc(): ProgressDoc {
  return {
    version: 1,
    activities: [],
    mistakes: [],
    mistakesRemoved: [],
    mastered: [],
    plan: {},
    planStreak: { last: null, count: 0 },
    unfinished: {},
    unfinishedRemoved: [],
    examDate: { value: null, at: 0 },
    seen: {},
  };
}

/** Turns untrusted input into a well-formed document, dropping anything malformed. */
export function normalizeDoc(input: unknown): ProgressDoc {
  const d = obj(input);
  const doc = emptyDoc();

  doc.activities = arr<Activity>(d.activities).filter(
    (a) => a && typeof a.id === 'string' && Number.isFinite(a.at),
  );
  doc.mistakes = arr<Mistake>(d.mistakes)
    .filter((m) => m && typeof m.id === 'string' && typeof m.prompt === 'string' && Number.isFinite(m.at))
    .map((m) => ({ ...m, rightDays: arr<string>(m.rightDays).filter((x) => typeof x === 'string' && DAY_KEY.test(x)) }));
  doc.mistakesRemoved = arr<{ prompt: string; at: number }>(d.mistakesRemoved).filter(
    (r) => r && typeof r.prompt === 'string' && Number.isFinite(r.at),
  );
  doc.mastered = arr<number>(d.mastered).filter((t) => Number.isFinite(t));

  for (const [day, steps] of Object.entries(obj(d.plan))) {
    if (!DAY_KEY.test(day)) continue;
    const clean: Record<string, number> = {};
    for (const [step, count] of Object.entries(obj(steps))) {
      if (typeof step === 'string' && step.length <= 20) clean[step] = Math.max(0, num(count));
    }
    doc.plan[day] = clean;
  }

  const streak = obj(d.planStreak);
  doc.planStreak = {
    last: typeof streak.last === 'string' && DAY_KEY.test(streak.last) ? streak.last : null,
    count: Math.max(0, Math.floor(num(streak.count))),
  };

  for (const [path, entry] of Object.entries(obj(d.unfinished))) {
    const e = obj(entry);
    if (typeof path === 'string' && path.startsWith('/') && Number.isFinite(e.at)) {
      doc.unfinished[path] = { ...(e as object), path, at: num(e.at) } as Unfinished;
    }
  }
  doc.unfinishedRemoved = arr<{ path: string; at: number }>(d.unfinishedRemoved).filter(
    (r) => r && typeof r.path === 'string' && Number.isFinite(r.at),
  );

  const exam = obj(d.examDate);
  doc.examDate = {
    value: typeof exam.value === 'string' && DAY_KEY.test(exam.value) ? exam.value : null,
    at: num(exam.at),
  };

  for (const [pool, entry] of Object.entries(obj(d.seen)).slice(0, LIMITS.seenPools)) {
    const e = obj(entry);
    if (pool.length > 80) continue;
    doc.seen[pool] = {
      cycle: Math.max(0, Math.floor(num(e.cycle))),
      ids: arr<string>(e.ids)
        .filter((id) => typeof id === 'string' && id.length <= 120)
        .slice(-LIMITS.seenIds),
    };
  }
  return doc;
}

function newestFirst<T extends { at: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.at - a.at);
}

export function mergeDocs(aIn: ProgressDoc, bIn: ProgressDoc): ProgressDoc {
  const a = normalizeDoc(aIn);
  const b = normalizeDoc(bIn);
  const out = emptyDoc();

  // Activities: union by id.
  const acts = new Map<string, Activity>();
  for (const x of [...a.activities, ...b.activities]) if (!acts.has(x.id)) acts.set(x.id, x);
  out.activities = newestFirst([...acts.values()]).slice(0, LIMITS.activities);

  // Removed mistakes: newest removal per prompt.
  const removed = new Map<string, number>();
  for (const r of [...a.mistakesRemoved, ...b.mistakesRemoved]) {
    removed.set(r.prompt, Math.max(removed.get(r.prompt) ?? 0, r.at));
  }
  out.mistakesRemoved = newestFirst([...removed].map(([prompt, at]) => ({ prompt, at }))).slice(
    0,
    LIMITS.mistakesRemoved,
  );

  // Mistakes: newer copy wins, review days are combined, removals win when newer.
  const mistakes = new Map<string, Mistake>();
  for (const m of [...a.mistakes, ...b.mistakes]) {
    const prev = mistakes.get(m.prompt);
    if (!prev) {
      mistakes.set(m.prompt, m);
      continue;
    }
    const winner = m.at > prev.at ? m : prev;
    const days =
      m.at === prev.at ? [...new Set([...(prev.rightDays ?? []), ...(m.rightDays ?? [])])].sort() : winner.rightDays ?? [];
    mistakes.set(m.prompt, { ...winner, rightDays: days });
  }
  out.mistakes = newestFirst(
    [...mistakes.values()].filter((m) => !((removed.get(m.prompt) ?? -1) >= m.at)),
  ).slice(0, LIMITS.mistakes);

  out.mastered = [...new Set([...a.mastered, ...b.mastered])].sort((x, y) => y - x).slice(0, LIMITS.mastered);

  // Plan: per day and step, the higher count; keep the most recent days.
  for (const src of [a.plan, b.plan]) {
    for (const [day, steps] of Object.entries(src)) {
      const target = (out.plan[day] ??= {});
      for (const [step, count] of Object.entries(steps)) target[step] = Math.max(target[step] ?? 0, count);
    }
  }
  const keepDays = Object.keys(out.plan).sort().reverse().slice(0, LIMITS.planDays);
  out.plan = Object.fromEntries(keepDays.map((d) => [d, out.plan[d]]));

  const sa = a.planStreak;
  const sb = b.planStreak;
  if (!sa.last) out.planStreak = sb;
  else if (!sb.last) out.planStreak = sa;
  else if (sa.last !== sb.last) out.planStreak = sa.last > sb.last ? sa : sb;
  else out.planStreak = { last: sa.last, count: Math.max(sa.count, sb.count) };

  // Unfinished sessions: newer per screen; a newer removal deletes it.
  const unRemoved = new Map<string, number>();
  for (const r of [...a.unfinishedRemoved, ...b.unfinishedRemoved]) {
    unRemoved.set(r.path, Math.max(unRemoved.get(r.path) ?? 0, r.at));
  }
  out.unfinishedRemoved = newestFirst([...unRemoved].map(([path, at]) => ({ path, at }))).slice(
    0,
    LIMITS.unfinishedRemoved,
  );
  const un = new Map<string, Unfinished>();
  for (const u of [...Object.values(a.unfinished), ...Object.values(b.unfinished)]) {
    const prev = un.get(u.path);
    if (!prev || u.at > prev.at) un.set(u.path, u);
  }
  out.unfinished = Object.fromEntries(
    newestFirst([...un.values()].filter((u) => !((unRemoved.get(u.path) ?? -1) >= u.at)))
      .slice(0, LIMITS.unfinished)
      .map((u) => [u.path, u]),
  );

  out.examDate = a.examDate.at >= b.examDate.at ? a.examDate : b.examDate;

  // Seen words: a later cycle replaces an earlier one; the same cycle is unioned.
  out.seen = {};
  for (const pool of new Set([...Object.keys(a.seen), ...Object.keys(b.seen)])) {
    const x = a.seen[pool];
    const y = b.seen[pool];
    if (!x || !y) out.seen[pool] = (x ?? y)!;
    else if (x.cycle !== y.cycle) out.seen[pool] = x.cycle > y.cycle ? x : y;
    else out.seen[pool] = { cycle: x.cycle, ids: [...new Set([...x.ids, ...y.ids])].slice(-LIMITS.seenIds) };
  }
  out.seen = Object.fromEntries(Object.entries(out.seen).slice(0, LIMITS.seenPools));
  return out;
}
