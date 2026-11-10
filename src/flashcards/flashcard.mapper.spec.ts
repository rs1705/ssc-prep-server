import type { Item } from 'generated/prisma/client';
import {
  sortByFront,
  toFlashcardDto,
  toFlashcardDtos,
} from './flashcard.mapper';

const base: Item = {
  id: '11111111-1111-4111-8111-111111111111',
  subject: 'English',
  topics: ['Vocab'],
  subtopics: [],
  passageId: null,
  type: 'Flashcard',
  difficulty: 'Medium',
  tags: ['pyq', 'noun'],
  hash: 'h',
  content: {
    front: { text: 'Optimum' },
    back: { content_eng: 'Best or most favorable' },
    exam: 'ssc cgl',
    year: '2019',
  },
};

describe('toFlashcardDto', () => {
  it('maps an Item to the shape the frontend already uses', () => {
    expect(toFlashcardDto(base)).toEqual({
      _id: base.id,
      id: base.id,
      subject: 'english',
      type: 'vocab',
      difficulty: 'medium',
      exam: 'ssc cgl',
      year: '2019',
      front: { text: 'Optimum' },
      back: { content_eng: 'Best or most favorable' },
      tags: ['pyq', 'noun'],
    });
  });

  it('returns null when content is not a well-formed flashcard', () => {
    expect(toFlashcardDto({ ...base, content: { nope: true } })).toBeNull();
    expect(toFlashcardDto({ ...base, content: null })).toBeNull();
  });

  it('drops malformed items from a list instead of throwing', () => {
    const bad = { ...base, id: 'x', content: {} };
    expect(toFlashcardDtos([base, bad])).toHaveLength(1);
  });

  it('defaults type and difficulty when missing', () => {
    const dto = toFlashcardDto({ ...base, topics: [], difficulty: null });
    expect(dto?.type).toBe('vocab');
    expect(dto?.difficulty).toBe('medium');
  });
});

describe('sortByFront', () => {
  it('sorts A-Z ignoring case without mutating the input', () => {
    const mk = (text: string) => ({
      ...toFlashcardDto({
        ...base,
        content: { front: { text }, back: { content_eng: 'x' } },
      })!,
    });
    const input = [mk('zeal'), mk('Apple'), mk('mango')];
    const sorted = sortByFront(input);
    expect(sorted.map((c) => c.front.text)).toEqual(['Apple', 'mango', 'zeal']);
    expect(input[0].front.text).toBe('zeal');
  });
});
