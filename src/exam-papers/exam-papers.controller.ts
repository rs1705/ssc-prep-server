import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { ExamPapersService } from './exam-papers.service';

@UseGuards(AuthGuard)
@Controller('exam-papers')
export class ExamPapersController {
  constructor(private readonly examPapersService: ExamPapersService) {}
  @Get()
  async getExamPapers() {
    return await this.examPapersService.getExamPapers();
  }

  @Get(':id/items')
  async getExamPaperItems(@Param('id') id: string) {
    return await this.examPapersService.getExamPaperItems(id);
  }
}
