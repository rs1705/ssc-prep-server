import { Module } from '@nestjs/common';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [FirebaseModule],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
