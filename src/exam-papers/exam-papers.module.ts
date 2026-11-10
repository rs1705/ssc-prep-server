import { Module } from '@nestjs/common';
import { ExamPapersService } from './exam-papers.service';
import { ExamPapersController } from './exam-papers.controller';

import { FirebaseModule } from 'src/firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  providers: [ExamPapersService],
  controllers: [ExamPapersController]
})
export class ExamPapersModule {}
