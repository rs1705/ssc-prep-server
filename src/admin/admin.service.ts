import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { itemHash, legacyHash, optionKey } from './item-hash';

/** Subtopic IDs sent with a question (`tags` from the pipeline). */
function topicTagsOf(q: any): string[] {
  return Array.isArray(q.tags)
    ? q.tags
        .filter(
          (t: unknown) => typeof t === 'string' && /^[a-z0-9.-]{1,80}$/.test(t),
        )
        .slice(0, 5)
    : [];
}

interface TopicNode {
  id: string;
  name: string;
  concepts?: string[];
  aliases?: string[];
  topics?: TopicNode[];
  subtopics?: TopicNode[];
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  async savePaper(payload: any) {
    try {
      const { examMetadata, passages, questions } = payload;

      // The topic list travels with the paper (Item.topicTags hold its subtopic IDs).
      // Saved first, so a failure here leaves the paper as it was.
      if (Array.isArray(payload.taxonomy))
        await this.saveTopics(payload.taxonomy);

      // 1. Upsert ExamPaper
      let paper = await this.prisma.examPaper.findFirst({
        where: {
          examName: examMetadata.examName,
          year: examMetadata.year,
          shift: examMetadata.shift,
        },
      });

      if (!paper) {
        paper = await this.prisma.examPaper.create({
          data: {
            title: `${examMetadata.examName} ${examMetadata.year} - ${examMetadata.shift}`,
            examName: examMetadata.examName,
            year: examMetadata.year,
            shift: examMetadata.shift,
            date: new Date(examMetadata.date),
          },
        });
      }
      const examPaperId = paper.id;
      // The paper's questions as they stand: a re-publish updates these in place (and the
      // paper keeps them until the new set is saved, so a failed save changes nothing).
      const previous = new Set(
        (
          await this.prisma.item.findMany({
            where: { examPapers: { some: { id: examPaperId } } },
            select: { id: true },
          })
        ).map((i) => i.id),
      );

      // 2. Save Passages
      const passageMap = new Map<string, string>();
      if (passages && passages.length > 0) {
        for (const p of passages) {
          if (p.passageText) {
            const newPassage = await this.prisma.passage.create({
              data: { text: p.passageText },
            });
            passageMap.set(p.passageId, newPassage.id);
          }
        }
      }

      // 3. Hashes (stem + figure + options + passage) and the items already saved with them.
      // Items saved before the v2 hash carry the stem-only hash: one is reused only when its
      // options match too, and then takes the new hash.
      const passageText = new Map<string, string>(
        (passages ?? []).map((p: any) => [p.passageId, p.passageText]),
      );
      const questionHashes: string[] = questions.map((q: any) =>
        itemHash(q, q.passageId ? passageText.get(q.passageId) : undefined),
      );
      const existingItems = await this.prisma.item.findMany({
        where: { hash: { in: questionHashes } },
        select: { id: true, hash: true },
      });
      const existingHashMap = new Map(
        existingItems.map((item) => [item.hash, item.id]),
      );
      const legacy = await this.prisma.item.findMany({
        where: {
          hash: {
            in: questions
              .filter(
                (_: any, i: number) => !existingHashMap.has(questionHashes[i]),
              )
              .map(legacyHash),
          },
        },
        select: { id: true, hash: true, content: true },
      });
      const legacyByHash = new Map(legacy.map((item) => [item.hash, item]));
      const claimed = new Set<string>();
      questions.forEach((q: any, i: number) => {
        if (existingHashMap.has(questionHashes[i])) return;
        const old = legacyByHash.get(legacyHash(q));
        if (
          old &&
          !claimed.has(old.id) &&
          (previous.has(old.id) ||
            optionKey(old.content) === optionKey(q.content))
        ) {
          claimed.add(old.id);
          existingHashMap.set(questionHashes[i], old.id);
        }
      });

      // 4. Build array of operations for Prisma batched transaction
      const ops: any[] = [];
      let newCount = 0;
      let existingCount = 0;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const hash = questionHashes[i];

        if (existingHashMap.has(hash)) {
          const existingId = existingHashMap.get(hash)!;
          const itemContent = {
            ...q.content,
            requiresImage: q.requiresImage || false,
          };
          const updateData: any = {
            subject: q.subject,
            topics: q.topics || (q.topic ? [q.topic] : ['Uncategorized']),
            subtopics: q.subtopics || (q.subtopic ? [q.subtopic] : []),
            difficulty: q.difficulty || null,
            topicTags: topicTagsOf(q),
            content: itemContent,
            hash,
            examPapers: {
              connect: { id: examPaperId },
            },
          };

          if (q.passageId && passageMap.has(q.passageId)) {
            updateData.passage = {
              connect: { id: passageMap.get(q.passageId) },
            };
          }

          ops.push(
            this.prisma.item.update({
              where: { id: existingId },
              data: updateData,
            }),
          );
          existingCount++;
        } else {
          const itemContent = {
            ...q.content,
            requiresImage: q.requiresImage || false,
          };
          const itemData: any = {
            type: 'PYQ',
            subject: q.subject,
            topics: q.topics || (q.topic ? [q.topic] : ['Uncategorized']),
            subtopics: q.subtopics || (q.subtopic ? [q.subtopic] : []),
            difficulty: q.difficulty || null,
            topicTags: topicTagsOf(q),
            content: itemContent,
            hash: hash,
            examPapers: {
              connect: { id: examPaperId },
            },
          };

          if (q.passageId && passageMap.has(q.passageId)) {
            itemData.passage = {
              connect: { id: passageMap.get(q.passageId) },
            };
          }

          ops.push(
            this.prisma.item.create({
              data: itemData,
            }),
          );
          newCount++;
        }
      }

      // 5. Execute operations concurrently in small chunks to avoid database connection exhaustion and 5s transaction limits
      const chunkSize = 15;
      const saved: { id: string }[] = [];
      for (let i = 0; i < ops.length; i += chunkSize) {
        const chunk = ops.slice(i, i + chunkSize);
        saved.push(...(await Promise.all(chunk)));
      }
      // The paper now holds exactly this upload's questions.
      await this.prisma.examPaper.update({
        where: { id: examPaperId },
        data: { items: { set: saved.map((item) => ({ id: item.id })) } },
      });

      return {
        success: true,
        message: `Saved! ${newCount} new questions created, ${existingCount} duplicate questions linked.`,
      };
    } catch (error: any) {
      this.logger.error('Error saving paper', error);
      return { success: false, error: error.message };
    }
  }

  /** Upserts the topic list (subject → topic → subtopic) sent with a paper. */
  private async saveTopics(subjects: TopicNode[]) {
    const rows: {
      id: string;
      name: string;
      level: number;
      parentId: string | null;
      position: number;
      concepts: string[];
      aliases: string[];
    }[] = [];
    const walk = (
      nodes: TopicNode[] | undefined,
      level: number,
      parentId: string | null,
    ) =>
      (nodes ?? []).slice(0, 500).forEach((n, position) => {
        if (typeof n?.id !== 'string' || typeof n?.name !== 'string') return;
        rows.push({
          id: n.id.slice(0, 80),
          name: n.name.slice(0, 120),
          level,
          parentId,
          position,
          concepts: (n.concepts ?? []).map(String).slice(0, 30),
          aliases: (n.aliases ?? []).map(String).slice(0, 40),
        });
        walk(level === 0 ? n.topics : n.subtopics, level + 1, n.id);
      });
    walk(subjects, 0, null);
    // Plain upserts in small parallel batches: a transaction over ~150 rows outlasts
    // Prisma's 5 s limit on a remote database.
    for (let i = 0; i < rows.length; i += 15) {
      await Promise.all(
        rows.slice(i, i + 15).map((r) =>
          this.prisma.topic.upsert({
            where: { id: r.id },
            create: r,
            update: r,
          }),
        ),
      );
    }
  }
}
