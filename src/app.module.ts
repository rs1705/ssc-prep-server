import { Module } from '@nestjs/common';
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
  providers: [AppService],
})
export class AppModule {}
