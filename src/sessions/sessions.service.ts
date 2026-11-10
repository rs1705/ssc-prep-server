import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async createSession(
    userId: string,
    payload: {
      sessionType: string;
      title?: string;
      examPaperId?: string;
      totalItems?: number;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: userId },
    });
    if (!user) throw new NotFoundException('user not found in the database.');

    return this.prisma.session.create({
      data: {
        userId: user.id,
        sessionType: payload.sessionType,
        title: payload.title,
        examPaperId: payload.examPaperId,
        totalItems: payload.totalItems || 0,
        timeTaken: 0,
      },
    });
  }

  async logInteraction(
    userId: string,
    sessionId: string,
    payload: {
      itemId: string;
      isCorrect?: boolean;
      rating?: number;
      timeTaken: number;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: userId },
    });
    if (!user) throw new NotFoundException('user not found in the database.');

    return this.prisma.interaction.create({
      data: {
        userId: user.id,
        sessionId,
        itemId: payload.itemId,
        isCorrect: payload.isCorrect,
        rating: payload.rating,
        timeTaken: payload.timeTaken,
      },
    });
  }

  async completeSession(userId: string, sessionId: string) {
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: userId },
    });
    if (!user) throw new NotFoundException('user not found in the database.');

    const interactions = await this.prisma.interaction.findMany({
      where: { sessionId, userId: user.id },
    });

    const score = interactions.filter((i) => i.isCorrect).length;
    const timeTaken = interactions.reduce((sum, i) => sum + i.timeTaken, 0);
    const xpEarned = score * 5;

    const session = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        isCompleted: true,
        score,
        timeTaken,
        xpEarned,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        xp: { increment: xpEarned },
        currentStreak: { increment: 1 },
      },
    });

    return session;
  }
}
