import * as crypto from 'crypto';

const squash = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, '');

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

/**
 * The hash that says two uploads are the same question: its text, its figure or table
 * blocks, every option (text and blocks) and its passage. SSC reuses stems word for word
 * ("How many triangles are there in the given figure?", "Select the most appropriate
 * synonym…"), so the stem alone would merge different questions.
 */
export function itemHash(q: any, passageText?: string): string {
  const c = q?.content ?? {};
  const options = (c.options ?? []).map(
    (o: any) => squash(o?.text) + JSON.stringify(o?.blocks ?? null),
  );
  return sha(
    [
      'v2',
      squash(c.question),
      JSON.stringify(c.questionBlocks ?? null),
      options.join('|'),
      squash(passageText),
    ].join('\n'),
  );
}

/** The old hash (stem only). Items saved before v2 carry it. */
export function legacyHash(q: any): string {
  return sha(squash(q?.content?.question));
}

/** Option texts in order, squashed: two questions with the same stem and these are one. */
export function optionKey(content: any): string {
  return (content?.options ?? []).map((o: any) => squash(o?.text)).join('|');
}
