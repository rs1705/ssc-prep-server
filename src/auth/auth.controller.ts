import { Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, type FirebaseUser } from './current-user.decorator';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('sync')
  syncUser(@CurrentUser() user: FirebaseUser) {
    return this.authService.syncUserWithFirebase(user);
  }
}
