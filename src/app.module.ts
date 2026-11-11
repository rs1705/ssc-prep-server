import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './admin/admin.module';
import { ExamPapersModule } from './exam-papers/exam-papers.module';
import { SessionsModule } from './sessions/sessions.module';
import { ItemsModule } from './items/items.module';
import { FlashcardsModule } from './flashcards/flashcards.module';
import { PyqsModule } from './pyqs/pyqs.module';

@Module({
  imports: [
    // Per-IP limit for every route: 120 requests a minute is far above normal use.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    FirebaseModule,
    AuthModule,
    PrismaModule,
    AdminModule,
    ExamPapersModule,
    SessionsModule,
    ItemsModule,
    FlashcardsModule,
    PyqsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
