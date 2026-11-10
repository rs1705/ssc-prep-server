import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FilterFlashcardsDto } from './filter-flashcards.dto';
import { ReviewFlashcardDto } from './review-flashcard.dto';

const check = async <T extends object>(cls: new () => T, plain: object) => {
  const instance = plainToInstance(cls, plain);
  const errors = await validate(instance, { whitelist: true });
  return { instance, errors };
};

describe('FilterFlashcardsDto', () => {
  it('accepts an empty query', async () => {
    expect((await check(FilterFlashcardsDto, {})).errors).toHaveLength(0);
  });

  it('turns a comma list into trimmed tags and "true" into a boolean', async () => {
    const { instance, errors } = await check(FilterFlashcardsDto, {
      tags: 'pyq, noun ,',
      highFrequency: 'true',
      limit: '50',
    });
    expect(errors).toHaveLength(0);
    expect(instance.tags).toEqual(['pyq', 'noun']);
    expect(instance.highFrequency).toBe(true);
    expect(instance.limit).toBe(50);
  });

  it('rejects a multi-letter alphabet and an out-of-range limit', async () => {
    const { errors } = await check(FilterFlashcardsDto, {
      alphabet: 'ab',
      limit: '5000',
    });
    expect(errors.map((e) => e.property).sort()).toEqual(['alphabet', 'limit']);
  });
});

describe('ReviewFlashcardDto', () => {
  it.each([1, 2, 3, 4])('accepts rating %i', async (rating) => {
    expect((await check(ReviewFlashcardDto, { rating })).errors).toHaveLength(
      0,
    );
  });

  it.each([0, 5, 2.5, 'x'])('rejects rating %p', async (rating) => {
    expect(
      (await check(ReviewFlashcardDto, { rating })).errors.length,
    ).toBeGreaterThan(0);
  });
});
