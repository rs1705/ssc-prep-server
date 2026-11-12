import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({
  imports: [AuthModule, FirebaseModule],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
