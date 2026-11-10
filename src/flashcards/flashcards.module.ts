import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { FlashcardsController } from './flashcards.controller';
import { FlashcardsService } from './flashcards.service';

@Module({
  imports: [FirebaseModule, AuthModule],
  providers: [FlashcardsService],
  controllers: [FlashcardsController],
})
export class FlashcardsModule {}
