import { itemHash, legacyHash, optionKey } from './item-hash';

const q = (
  question: string,
  options: string[],
  extra: Record<string, unknown> = {},
) => ({
  content: {
    question,
    options: options.map((text, i) => ({ label: 'ABCD'[i], text })),
    ...extra,
  },
});

describe('itemHash', () => {
  it('tells apart questions that share a stem', () => {
    const a = q('Select the most appropriate synonym of the given word.', [
      'Plenty',
      'Rare',
      'Small',
      'Weak',
    ]);
    const b = q('Select the most appropriate synonym of the given word.', [
      'Angry',
      'Calm',
      'Wild',
      'Slow',
    ]);
    expect(itemHash(a)).not.toBe(itemHash(b));
    expect(legacyHash(a)).toBe(legacyHash(b));
  });

  it('is the same for the same question, whatever the spacing or case', () => {
    expect(itemHash(q('How many  triangles?', ['8', '10']))).toBe(
      itemHash(q('how many triangles?', ['8', ' 10'])),
    );
  });

  it('tells apart figures with the same stem and options', () => {
    const fig = (n: number) =>
      q(
        'How many triangles are there in the given figure?',
        ['8', '10', '12', '14'],
        {
          questionBlocks: [
            { type: 'diagram', diagram: { kind: 'trace', w: n, h: n } },
          ],
        },
      );
    expect(itemHash(fig(100))).not.toBe(itemHash(fig(120)));
  });

  it('counts the passage', () => {
    const blank = q(
      'Select the most appropriate option to fill in blank number 1.',
      ['a', 'b', 'c', 'd'],
    );
    expect(itemHash(blank, 'Passage one')).not.toBe(
      itemHash(blank, 'Passage two'),
    );
  });

  it('keys options by text', () => {
    expect(optionKey(q('x', ['A b', 'C'])['content'])).toBe('ab|c');
  });
});
