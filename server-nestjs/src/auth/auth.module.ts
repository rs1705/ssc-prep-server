import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
})
export class AuthModule {}
