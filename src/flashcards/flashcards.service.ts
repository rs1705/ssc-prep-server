import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from 'src/auth/auth.service';
import type { FirebaseUser } from 'src/auth/current-user.decorator';
import type { FilterFlashcardsDto } from './dto/filter-flashcards.dto';
import {
  sortByFront,
  toFlashcardDtos,
  type FlashcardDto,
} from './flashcard.mapper';
import { scheduleReview, type Rating } from './fsrs-scheduler';

/** Cards served per day: due reviews first, then new cards to fill the rest. */
export const DAILY_CARD_LIMIT = 30;
const HIGH_FREQUENCY_TAG = 'high frequency';

export interface ReviewResult {
  cardId: string;
  rating: Rating;
  dueDate: Date;
  state: number;
  reps: number;
  lapses: number;
  stability: number;
  scheduledDays: number;
}

/** "vocab" -> "Vocab". Topics are stored capitalised by the seed/ingestion. */
function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

@Injectable()
export class FlashcardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /** Public deck browsing, sorted A-Z by the word. */
  async list(filter: FilterFlashcardsDto): Promise<FlashcardDto[]> {
    const and: Prisma.ItemWhereInput[] = [{ type: 'Flashcard' }];

    if (filter.subject) {
      and.push({ subject: { equals: filter.subject, mode: 'insensitive' } });
    }
    if (filter.type) {
      and.push({ topics: { has: capitalise(filter.type) } });
    }
    if (filter.difficulty) {
      and.push({
        difficulty: { equals: filter.difficulty, mode: 'insensitive' },
      });
    }
    if (filter.exam) {
      and.push({
        content: { path: ['exam'], equals: filter.exam.toLowerCase() },
      });
    }
    if (filter.year) {
      and.push({ content: { path: ['year'], equals: filter.year } });
    }
    if (filter.tags?.length) {
      and.push({ tags: { hasEvery: filter.tags.map((t) => t.toLowerCase()) } });
    }
    if (filter.highFrequency) {
      and.push({ tags: { has: HIGH_FREQUENCY_TAG } });
    }
    if (filter.alphabet) {
      and.push({
        content: {
          path: ['front', 'text'],
          string_starts_with: filter.alphabet,
          mode: 'insensitive',
        },
      });
    }

    const items = await this.prisma.item.findMany({ where: { AND: and } });
    const cards = sortByFront(toFlashcardDtos(items));
    return filter.limit ? cards.slice(0, filter.limit) : cards;
  }

  /** Today's spaced-repetition deck: cards due for review, then unseen ones. */
  async studyDeck(firebaseUser: FirebaseUser): Promise<FlashcardDto[]> {
    const user = await this.resolveUser(firebaseUser);

    const due = await this.prisma.fsrsData.findMany({
      where: {
        userId: user.id,
        dueDate: { lte: new Date() },
        item: { type: 'Flashcard' },
      },
      orderBy: { dueDate: 'asc' },
      take: DAILY_CARD_LIMIT,
      include: { item: true },
    });

    const remaining = DAILY_CARD_LIMIT - due.length;
    const fresh =
      remaining > 0
        ? await this.prisma.item.findMany({
            where: {
              type: 'Flashcard',
              fsrsData: { none: { userId: user.id } },
            },
            orderBy: { id: 'asc' },
            take: remaining,
          })
        : [];

    return toFlashcardDtos([...due.map((d) => d.item), ...fresh]);
  }

  /** Record a rating and schedule the next review (one transaction). */
  async review(
    firebaseUser: FirebaseUser,
    itemId: string,
    rating: Rating,
    timeTaken = 0,
  ): Promise<ReviewResult> {
    const user = await this.resolveUser(firebaseUser);

    const item = await this.prisma.item.findFirst({
      where: { id: itemId, type: 'Flashcard' },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Flashcard not found.');

    const existing = await this.prisma.fsrsData.findUnique({
      where: { userId_itemId: { userId: user.id, itemId } },
    });
    const next = scheduleReview(existing, rating);

    const [saved] = await this.prisma.$transaction([
      this.prisma.fsrsData.upsert({
        where: { userId_itemId: { userId: user.id, itemId } },
        create: { userId: user.id, itemId, ...next },
        update: next,
      }),
      this.prisma.interaction.create({
        data: { userId: user.id, itemId, rating, timeTaken },
      }),
    ]);

    return {
      cardId: itemId,
      rating,
      dueDate: saved.dueDate,
      state: saved.state,
      reps: saved.reps,
      lapses: saved.lapses,
      stability: saved.stability,
      scheduledDays: saved.scheduledDays,
    };
  }

  /** Users are created on first use, so the client never has to call /auth/sync first. */
  private async resolveUser(firebaseUser: FirebaseUser) {
    const existing = await this.prisma.user.findUnique({
      where: { firebaseUid: firebaseUser.uid },
    });
    return existing ?? this.auth.syncUserWithFirebase(firebaseUser);
  }
}
