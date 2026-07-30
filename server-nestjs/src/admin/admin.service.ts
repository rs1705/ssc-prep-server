import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  async savePaper(payload: any) {
    try {
      const { examMetadata, questions } = payload;
      
      // 1. Upsert ExamPaper
      const paper = await this.prisma.examPaper.findFirst({
        where: {
          examName: examMetadata.examName,
          year: examMetadata.year,
          shift: examMetadata.shift,
        }
      });

      let examPaperId = paper?.id;

      if (!paper) {
        const newPaper = await this.prisma.examPaper.create({
          data: {
            title: `${examMetadata.examName} ${examMetadata.year} - ${examMetadata.shift}`,
            examName: examMetadata.examName,
            year: examMetadata.year,
            shift: examMetadata.shift,
            date: new Date(examMetadata.date),
          }
        });
        examPaperId = newPaper.id;
      }

      // 2. Insert Questions with Deduplication Hash
      let newCount = 0;
      let existingCount = 0;

      for (const q of questions) {
        // Normalize text to create hash (removes all whitespace and lowercases)
        const normalized = q.content.question.toLowerCase().replace(/\s+/g, '');
        const hash = crypto.createHash('sha256').update(normalized).digest('hex');

        // Check if question exists
        const existingItem = await this.prisma.item.findUnique({
          where: { hash: hash }
        });

        if (existingItem) {
          // Just connect to ExamPaper
          await this.prisma.item.update({
            where: { id: existingItem.id },
            data: {
              examPapers: {
                connect: { id: examPaperId }
              }
            }
          });
          existingCount++;
        } else {
          // Attach requiresImage to the JSONB content so the frontend can handle diagrams later
          const itemContent = { ...q.content, requiresImage: q.requiresImage || false };

          // Create new item
          await this.prisma.item.create({
            data: {
              type: "PYQ",
              subject: q.subject,
              topic: q.topic || "Uncategorized",
              subtopic: q.subtopic,
              content: itemContent,
              hash: hash,
              examPapers: {
                connect: { id: examPaperId }
              }
            }
          });
          newCount++;
        }
      }

      return {
        success: true,
        message: `Saved! ${newCount} new questions created, ${existingCount} duplicate questions linked.`
      };
      
    } catch (error) {
      this.logger.error('Error saving paper', error);
      return { success: false, error: error.message };
    }
  }
}
