import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { MocksService } from './mocks.service';

/** Full-length Tier 1 tests: real past papers and generated mocks. Public, read-only. */
@Controller('mocks')
export class MocksController {
  constructor(private readonly mocks: MocksService) {}

  /** GET /mocks/papers */
  @Get('papers')
  papers() {
    return this.mocks.papers();
  }

  /** GET /mocks/papers/:id */
  @Get('papers/:id')
  paper(@Param('id', ParseUUIDPipe) id: string) {
    return this.mocks.paper(id);
  }

  /** GET /mocks/new: a fresh 100-question mock. */
  @Get('new')
  generate() {
    return this.mocks.generate();
  }
}
