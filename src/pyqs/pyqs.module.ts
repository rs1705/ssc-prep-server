import { Module } from '@nestjs/common';
import { PyqsController } from './pyqs.controller';
import { PyqsService } from './pyqs.service';

@Module({
  providers: [PyqsService],
  controllers: [PyqsController],
})
export class PyqsModule {}
