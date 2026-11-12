import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { CurrentUser, type FirebaseUser } from 'src/auth/current-user.decorator';
import { ProgressService } from './progress.service';

/** The signed-in user's practice progress, synced across devices. */
@Controller('me/progress')
@UseGuards(AuthGuard)
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  get(@CurrentUser() user: FirebaseUser) {
    return this.progress.get(user);
  }

  /** Body: the device's whole progress document. Returns the merged document. */
  @Put()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  sync(@CurrentUser() user: FirebaseUser, @Body() body: { data?: unknown }) {
    return this.progress.sync(user, body?.data);
  }
}
