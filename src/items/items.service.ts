import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get flashcards with optional filtering by topic, difficulty, and pagination.
   */
  async getFlashcards(query: {
    topic?: string;
    difficulty?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { type: 'Flashcard' };

    if (query.topic) {
      where.topics = { has: query.topic };
    }
    if (query.difficulty) {
      where.difficulty = query.difficulty;
    }

    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        take: query.limit || 20,
        skip: query.offset || 0,
        orderBy: { id: 'asc' },
      }),
      this.prisma.item.count({ where }),
    ]);

    return { items, total, limit: query.limit || 20, offset: query.offset || 0 };
  }

  /**
   * Get a single item by ID.
   */
  async getItemById(id: string) {
    return this.prisma.item.findUnique({ where: { id } });
  }

  /**
   * Get all distinct topics for a given item type (for filter dropdowns).
   */
  async getTopics(type?: string) {
    const where: any = {};
    if (type) where.type = type;

    const items = await this.prisma.item.findMany({
      where,
      select: { topics: true },
    });

    // Flatten and deduplicate topics
    const topicsSet = new Set<string>();
    for (const item of items) {
      for (const t of item.topics) {
        topicsSet.add(t);
      }
    }
    return Array.from(topicsSet).sort();
  }

  /**
   * Get items by type (PYQ, Flashcard, Formula, etc.) with pagination.
   */
  async getItemsByType(
    type: string,
    query: { subject?: string; limit?: number; offset?: number },
  ) {
    const where: any = { type };

    if (query.subject) {
      where.subject = query.subject;
    }

    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        take: query.limit || 20,
        skip: query.offset || 0,
        orderBy: { id: 'asc' },
      }),
      this.prisma.item.count({ where }),
    ]);

    return { items, total, limit: query.limit || 20, offset: query.offset || 0 };
  }
}
