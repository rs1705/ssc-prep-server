import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { AdminModule } from './admin/admin.module';
import { ExamPapersModule } from './exam-papers/exam-papers.module';

@Module({
  imports: [FirebaseModule, AuthModule, PrismaModule, AdminModule, ExamPapersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
