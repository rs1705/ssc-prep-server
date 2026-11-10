import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { PyqQueryDto, SubjectQueryDto } from './dto/pyq-query.dto';
import { PyqsService } from './pyqs.service';

/** Public read-only access to previous-year questions. */
@Controller('pyqs')
export class PyqsController {
  constructor(private readonly pyqs: PyqsService) {}

  /** GET /pyqs/topics?subject=maths */
  @Get('topics')
  topics(@Query() query: SubjectQueryDto) {
    return this.pyqs.topics(query.subject);
  }

  /** GET /pyqs/papers?subject=maths */
  @Get('papers')
  papers(@Query() query: SubjectQueryDto) {
    return this.pyqs.papers(query.subject);
  }

  /** GET /pyqs/papers/:id?subject=maths */
  @Get('papers/:id')
  sectionalPaper(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SubjectQueryDto,
  ) {
    return this.pyqs.sectionalPaper(id, query.subject);
  }

  /** GET /pyqs?subject=maths&topic=Arithmetic&limit=10 */
  @Get()
  practiceSet(@Query() query: PyqQueryDto) {
    return this.pyqs.practiceSet(query.subject, query.topic, query.limit);
  }
}
