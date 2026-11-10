import {
  Controller,
  Get,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { ItemsService } from './items.service';

@UseGuards(AuthGuard)
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  /**
   * GET /items/flashcards?topic=Vocab&difficulty=Medium&limit=20&offset=0
   */
  @Get('flashcards')
  async getFlashcards(
    @Query('topic') topic?: string,
    @Query('difficulty') difficulty?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.itemsService.getFlashcards({
      topic,
      difficulty,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * GET /items/topics?type=Flashcard
   * Returns distinct topic names for filter dropdowns.
   */
  @Get('topics')
  async getTopics(@Query('type') type?: string) {
    return this.itemsService.getTopics(type);
  }

  /**
   * GET /items/by-type/:type?subject=English&limit=20&offset=0
   */
  @Get('by-type/:type')
  async getItemsByType(
    @Param('type') type: string,
    @Query('subject') subject?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.itemsService.getItemsByType(type, {
      subject,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * GET /items/:id
   */
  @Get(':id')
  async getItemById(@Param('id') id: string) {
    return this.itemsService.getItemById(id);
  }
}
