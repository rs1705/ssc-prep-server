import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type FirebaseUser,
} from 'src/auth/current-user.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { FilterFlashcardsDto } from './dto/filter-flashcards.dto';
import { ReviewFlashcardDto } from './dto/review-flashcard.dto';
import { FlashcardsService } from './flashcards.service';

@Controller('flashcards')
export class FlashcardsController {
  constructor(private readonly flashcards: FlashcardsService) {}

  /** GET /flashcards?type=vocab&alphabet=a&highFrequency=true  (public) */
  @Get()
  list(@Query() filter: FilterFlashcardsDto) {
    return this.flashcards.list(filter);
  }

  /** GET /flashcards/study-deck  (signed in) */
  @UseGuards(AuthGuard)
  @Get('study-deck')
  studyDeck(@CurrentUser() user: FirebaseUser) {
    return this.flashcards.studyDeck(user);
  }

  /** POST /flashcards/:id/review  { rating: 1-4 }  (signed in) */
  @UseGuards(AuthGuard)
  @Post(':id/review')
  review(
    @CurrentUser() user: FirebaseUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewFlashcardDto,
  ) {
    return this.flashcards.review(user, id, dto.rating, dto.timeTaken);
  }
}
