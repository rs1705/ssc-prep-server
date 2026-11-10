import {
  Body,
  Controller,
  UseGuards,
  Post,
  Put,
  Param,
  Req,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { SessionsService } from './sessions.service';

@UseGuards(AuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  async createSession(
    @Req() req: any,
    @Body()
    body: {
      sessionType: string;
      title?: string;
      examPaperId?: string;
      totalItems?: number;
    },
  ) {
    const userId = req.user.uid;
    return this.sessionsService.createSession(userId, body);
  }

  @Post(':id/interactions')
  async logInteraction(
    @Req() req: any,
    @Param('id') sessionId: string,
    @Body()
    body: {
      itemId: string;
      isCorrect?: boolean;
      rating?: number;
      timeTaken: number;
    },
  ) {
    const userId = req.user.uid;
    return this.sessionsService.logInteraction(userId, sessionId, body);
  }

  @Put(':id/complete')
  async completeSession(@Req() req: any, @Param('id') sessionId: string) {
    const userId = req.user.uid;
    return this.sessionsService.completeSession(userId, sessionId);
  }
}
