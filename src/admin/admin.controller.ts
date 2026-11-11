import { BadRequestException, Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminService } from './admin.service';
import { AdminKeyGuard } from './admin-key.guard';

const MAX_QUESTIONS = 500;

/** Rejects payloads that don't look like a parsed exam paper before anything is written. */
function assertPaperPayload(payload: unknown): void {
  const fail = (why: string) => {
    throw new BadRequestException(`Invalid paper: ${why}`);
  };
  if (!payload || typeof payload !== 'object') fail('body must be an object');
  const { examMetadata: meta, questions, passages } = payload as Record<string, unknown>;

  if (!meta || typeof meta !== 'object') fail('examMetadata is required');
  const m = meta as Record<string, unknown>;
  if (typeof m.examName !== 'string' || !m.examName.trim()) fail('examMetadata.examName is required');
  if (typeof m.shift !== 'string' || !m.shift.trim()) fail('examMetadata.shift is required');
  if (!['string', 'number'].includes(typeof m.year)) fail('examMetadata.year is required');
  if (Number.isNaN(new Date(String(m.date)).getTime())) fail('examMetadata.date must be a date');

  if (!Array.isArray(questions) || questions.length === 0) fail('questions must be a non-empty list');
  if ((questions as unknown[]).length > MAX_QUESTIONS) fail(`at most ${MAX_QUESTIONS} questions`);
  (questions as unknown[]).forEach((q, i) => {
    const item = q as Record<string, any>;
    if (!item || typeof item !== 'object') fail(`questions[${i}] must be an object`);
    if (typeof item.subject !== 'string') fail(`questions[${i}].subject is required`);
    if (typeof item.content?.question !== 'string') fail(`questions[${i}].content.question is required`);
  });

  if (passages !== undefined && !Array.isArray(passages)) fail('passages must be a list');
}

@Controller('admin')
@UseGuards(AdminKeyGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('save-paper')
  @HttpCode(200)
  // Ingestion is rare; keep brute-forcing the key slow.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async savePaper(@Body() payload: unknown) {
    assertPaperPayload(payload);
    return this.adminService.savePaper(payload);
  }
}
