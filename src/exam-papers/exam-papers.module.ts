import { Module } from '@nestjs/common';
import { ExamPapersService } from './exam-papers.service';
import { ExamPapersController } from './exam-papers.controller';

@Module({
  providers: [ExamPapersService],
  controllers: [ExamPapersController]
})
export class ExamPapersModule {}
