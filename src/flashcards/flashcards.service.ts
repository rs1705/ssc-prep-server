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
import {
  previewReview,
  scheduleReview,
  type Rating,
  type ReviewPreview,
} from './fsrs-scheduler';

/** Cards served per session: due reviews first, then new cards to fill the rest. */
export const DAILY_CARD_LIMIT = 30;
/** New (never-seen) cards a learner is introduced to per day, however often they reload. */
export const NEW_CARDS_PER_DAY = 30;
/** India Standard Time is UTC+5:30 all year (no daylight saving). */
const IST_OFFSET_MS = 330 * 60_000;

/** Midnight at the start of `now`'s day in India, as a UTC instant. */
export function startOfIndianDay(now: Date): Date {
  const local = now.getTime() + IST_OFFSET_MS;
  return new Date(local - (local % 86_400_000) - IST_OFFSET_MS);
}
const HIGH_FREQUENCY_TAG = 'high frequency';

export interface ReviewResult {
  cardId: string;
  /** Due date for each rating if the card is rated again now (it may come back this session). */
  nextReview: ReviewPreview;
  rating: Rating;
  dueDate: Date;
  state: number;
  reps: number;
  lapses: number;
  stability: number;
  scheduledDays: number;
}

/** Fisher-Yates on a copy. */
function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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

    const dtos = await this.cachedCards(and);
    const cards = filter.random ? shuffled(dtos) : sortByFront(dtos);
    return filter.limit ? cards.slice(0, filter.limit) : cards;
  }

  /**
   * The card bank only changes when content is uploaded, so filtered lists are
   * kept in memory for a few minutes. Games ask for random samples of the same
   * deck again and again; this saves a database round trip each time.
   */
  private readonly cardCache = new Map<
    string,
    { at: number; cards: FlashcardDto[] }
  >();
  private static readonly CARD_CACHE_MS = 5 * 60_000;

  private async cachedCards(
    and: Prisma.ItemWhereInput[],
  ): Promise<FlashcardDto[]> {
    const key = JSON.stringify(and);
    const hit = this.cardCache.get(key);
    if (hit && Date.now() - hit.at < FlashcardsService.CARD_CACHE_MS)
      return hit.cards;
    const items = await this.prisma.item.findMany({ where: { AND: and } });
    const cards = toFlashcardDtos(items);
    if (this.cardCache.size > 200) this.cardCache.clear();
    this.cardCache.set(key, { at: Date.now(), cards });
    return cards;
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

    // New cards fill the session, but never past the day's allowance: reloading the
    // page must not hand out another 30 new words.
    const newLeft =
      DAILY_CARD_LIMIT - due.length > 0
        ? NEW_CARDS_PER_DAY - (await this.newCardsSeenToday(user.id))
        : 0;
    const remaining = Math.min(DAILY_CARD_LIMIT - due.length, newLeft);
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

    // Attach real FSRS intervals so the rating buttons can show them.
    const now = new Date();
    const stateByItem = new Map(due.map((d) => [d.itemId, d]));
    return toFlashcardDtos([...due.map((d) => d.item), ...fresh]).map(
      (card) => ({
        ...card,
        nextReview: previewReview(stateByItem.get(card.id) ?? null, now),
      }),
    );
  }

  /** How many flashcards this learner reviewed for the first time today (India time). */
  private async newCardsSeenToday(userId: string): Promise<number> {
    const firstSeen = await this.prisma.interaction.groupBy({
      by: ['itemId'],
      where: { userId, item: { type: 'Flashcard' } },
      _min: { createdAt: true },
      having: { createdAt: { _min: { gte: startOfIndianDay(new Date()) } } },
    });
    return firstSeen.length;
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
      nextReview: previewReview(saved, new Date()),
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
