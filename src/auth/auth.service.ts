import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FirebaseUser } from './current-user.decorator';
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}
  async syncUserWithFirebase(user: FirebaseUser) {
    return await this.prisma.user.upsert({
      where: { firebaseUid: user.uid },
      update: {},
      create: { email: user.email, firebaseUid: user.uid, name: user.name },
    });
  }
}
