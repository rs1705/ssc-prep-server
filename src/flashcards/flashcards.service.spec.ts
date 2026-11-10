/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- jest mocks are intentionally loosely typed */
import { NotFoundException } from '@nestjs/common';
import type { Item } from 'generated/prisma/client';
import { DAILY_CARD_LIMIT, FlashcardsService } from './flashcards.service';

const user = { uid: 'firebase-1', email: 'a@b.c', name: 'Test' };

const item = (id: string, text: string): Item => ({
  id,
  subject: 'English',
  topics: ['Vocab'],
  subtopics: [],
  passageId: null,
  type: 'Flashcard',
  difficulty: 'Medium',
  tags: [],
  hash: id,
  content: { front: { text }, back: { content_eng: 'meaning' } },
});

function setup() {
  const prisma = {
    item: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
    fsrsData: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockReturnValue('upsert-op'),
    },
    interaction: { create: jest.fn().mockReturnValue('create-op') },
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }) },
    $transaction: jest.fn(),
  };
  const auth = {
    syncUserWithFirebase: jest.fn().mockResolvedValue({ id: 'user-1' }),
  };
  const service = new FlashcardsService(prisma as never, auth as never);
  return { prisma, auth, service };
}

describe('FlashcardsService.list', () => {
  it('always restricts to flashcards and builds the requested filters', async () => {
    const { prisma, service } = setup();
    await service.list({
      type: 'vocab',
      subject: 'english',
      alphabet: 'a',
      highFrequency: true,
      tags: ['pyq'],
      exam: 'SSC CGL',
      year: '2019',
    });
    const where = prisma.item.findMany.mock.calls[0][0].where.AND;
    expect(where).toContainEqual({ type: 'Flashcard' });
    expect(where).toContainEqual({ topics: { has: 'Vocab' } });
    expect(where).toContainEqual({ tags: { has: 'high frequency' } });
    expect(where).toContainEqual({ tags: { hasEvery: ['pyq'] } });
    expect(where).toContainEqual({
      content: { path: ['exam'], equals: 'ssc cgl' },
    });
    expect(where).toContainEqual({
      content: {
        path: ['front', 'text'],
        string_starts_with: 'a',
        mode: 'insensitive',
      },
    });
  });

  it('returns cards sorted A-Z and honours limit', async () => {
    const { prisma, service } = setup();
    prisma.item.findMany.mockResolvedValue([
      item('1', 'zeal'),
      item('2', 'abate'),
      item('3', 'mild'),
    ]);
    const cards = await service.list({ limit: 2 });
    expect(cards.map((c) => c.front.text)).toEqual(['abate', 'mild']);
  });
});

describe('FlashcardsService.studyDeck', () => {
  it('serves due cards first, then fills the day with new ones', async () => {
    const { prisma, service } = setup();
    prisma.fsrsData.findMany.mockResolvedValue([
      { item: item('due-1', 'due') },
    ]);
    prisma.item.findMany.mockResolvedValue([item('new-1', 'new')]);

    const deck = await service.studyDeck(user);

    expect(deck.map((c) => c.front.text)).toEqual(['due', 'new']);
    expect(prisma.item.findMany.mock.calls[0][0].take).toBe(
      DAILY_CARD_LIMIT - 1,
    );
  });

  it('skips the new-card query when the daily limit is already due', async () => {
    const { prisma, service } = setup();
    prisma.fsrsData.findMany.mockResolvedValue(
      Array.from({ length: DAILY_CARD_LIMIT }, (_, i) => ({
        item: item(String(i), `w${i}`),
      })),
    );
    await service.studyDeck(user);
    expect(prisma.item.findMany).not.toHaveBeenCalled();
  });

  it('creates the user on first use', async () => {
    const { prisma, auth, service } = setup();
    prisma.user.findUnique.mockResolvedValue(null);
    await service.studyDeck(user);
    expect(auth.syncUserWithFirebase).toHaveBeenCalledWith(user);
  });
});

describe('FlashcardsService.review', () => {
  it('throws 404 for an unknown card', async () => {
    const { prisma, service } = setup();
    prisma.item.findFirst.mockResolvedValue(null);
    await expect(service.review(user, 'x', 3)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('saves FSRS state and the interaction together', async () => {
    const { prisma, service } = setup();
    prisma.item.findFirst.mockResolvedValue({ id: 'card-1' });
    prisma.$transaction.mockResolvedValue([
      {
        dueDate: new Date(),
        state: 1,
        reps: 1,
        lapses: 0,
        stability: 3,
        scheduledDays: 1,
      },
    ]);

    const result = await service.review(user, 'card-1', 3, 7);

    expect(prisma.$transaction).toHaveBeenCalledWith([
      'upsert-op',
      'create-op',
    ]);
    expect(prisma.interaction.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', itemId: 'card-1', rating: 3, timeTaken: 7 },
    });
    const upsert = prisma.fsrsData.upsert.mock.calls[0][0];
    expect(upsert.where).toEqual({
      userId_itemId: { userId: 'user-1', itemId: 'card-1' },
    });
    expect(upsert.create.reps).toBe(1);
    expect(result).toMatchObject({ cardId: 'card-1', rating: 3, reps: 1 });
  });
});
