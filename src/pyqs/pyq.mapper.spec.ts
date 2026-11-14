import {
  blocksOrUndefined,
  toPyqDto,
  type ItemWithRelations,
} from './pyq.mapper';

const item = (content: Record<string, unknown>): ItemWithRelations =>
  ({
    id: 'i1',
    topics: ['Number Series'],
    subtopics: [],
    difficulty: 'Easy',
    content: {
      question: 'Find the next term.\n\n3, 8, 15, ?',
      options: [
        { label: 'A', text: '22' },
        { label: 'B', text: '24' },
      ],
      correctAnswerLabel: 'B',
      explanation: 'Differences rise by 2.',
      ...content,
    },
  }) as unknown as ItemWithRelations;

describe('toPyqDto blocks', () => {
  it('passes question, option and explanation blocks through', () => {
    const questionBlocks = [
      { type: 'text', text: 'Find the next term.' },
      { type: 'series', items: [3, 8, 15, '?'] },
    ];
    const explanationBlocks = [
      {
        type: 'series',
        items: [3, 8, 15, 24],
        diffs: ['+5', '+7', '+9'],
        found: 3,
      },
    ];
    const dto = toPyqDto(
      item({
        questionBlocks,
        explanationBlocks,
        options: [
          { label: 'A', text: '22', blocks: [{ type: 'math', latex: '22' }] },
          { label: 'B', text: '24' },
        ],
      }),
    )!;
    expect(dto.questionBlocks).toEqual(questionBlocks);
    expect(dto.explanationBlocks).toEqual(explanationBlocks);
    expect(dto.options[0].blocks).toEqual([{ type: 'math', latex: '22' }]);
    expect(dto.options[1]).toEqual({ label: 'B', text: '24' });
    expect(dto.question).toContain('3, 8, 15, ?');
  });

  it('leaves blocks out when there are none or they are malformed', () => {
    const plain = toPyqDto(item({}))!;
    expect('questionBlocks' in plain).toBe(false);
    expect('explanationBlocks' in plain).toBe(false);
    const bad = toPyqDto(
      item({
        questionBlocks: 'oops',
        explanationBlocks: [{ text: 'no type' }],
      }),
    )!;
    expect(bad.questionBlocks).toBeUndefined();
    expect(bad.explanationBlocks).toBeUndefined();
  });

  it('caps the number of blocks', () => {
    expect(
      blocksOrUndefined(
        Array.from({ length: 61 }, () => ({ type: 'text', text: 'x' })),
      ),
    ).toBeUndefined();
    expect(blocksOrUndefined([])).toBeUndefined();
    expect(blocksOrUndefined([{ type: 'text', text: 'x' }])).toHaveLength(1);
  });
});
