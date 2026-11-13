import { Module } from '@nestjs/common';
import { MocksController } from './mocks.controller';
import { MocksService } from './mocks.service';
import { PyqsController } from './pyqs.controller';
import { PyqsService } from './pyqs.service';

@Module({
  providers: [PyqsService, MocksService],
  controllers: [PyqsController, MocksController],
})
export class PyqsModule {}
