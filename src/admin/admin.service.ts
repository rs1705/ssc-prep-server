import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  async savePaper(payload: any) {
    try {
      const { examMetadata, passages, questions } = payload;

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
      } else {
        await this.prisma.examPaper.update({
          where: { id: paper.id },
          data: {
            items: { set: [] },
          },
        });
      }
      const examPaperId = paper.id;

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

      // 3. Pre-compute all hashes and batch fetch existing items in 1 query
      const questionHashes = questions.map((q: any) => {
        const normalized = q.content.question.toLowerCase().replace(/\s+/g, "");
        return crypto.createHash("sha256").update(normalized).digest("hex");
      });

      const existingItems = await this.prisma.item.findMany({
        where: { hash: { in: questionHashes } },
        select: { id: true, hash: true },
      });
      const existingHashMap = new Map(
        existingItems.map((item) => [item.hash, item.id]),
      );

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
            topics: q.topics || (q.topic ? [q.topic] : ["Uncategorized"]),
            subtopics: q.subtopics || (q.subtopic ? [q.subtopic] : []),
            difficulty: q.difficulty || null,
            content: itemContent,
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
            type: "PYQ",
            subject: q.subject,
            topics: q.topics || (q.topic ? [q.topic] : ["Uncategorized"]),
            subtopics: q.subtopics || (q.subtopic ? [q.subtopic] : []),
            difficulty: q.difficulty || null,
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
      for (let i = 0; i < ops.length; i += chunkSize) {
        const chunk = ops.slice(i, i + chunkSize);
        await Promise.all(chunk);
      }

      return {
        success: true,
        message: `Saved! ${newCount} new questions created, ${existingCount} duplicate questions linked.`,
      };
    } catch (error: any) {
      this.logger.error("Error saving paper", error);
      return { success: false, error: error.message };
    }
  }
}
