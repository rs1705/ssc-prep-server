import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
@Injectable()
export class ExamPapersService {
  constructor(private readonly prisma: PrismaService) {}
  async getExamPapers() {
    return this.prisma.examPaper.findMany();
  }

  async getExamPaperItems(examPaperId: string) {
    return this.prisma.examPaper.findUnique({
      where: {
        id: examPaperId,
      },
      include: {
        items: true,
      },
    });
  }
}
