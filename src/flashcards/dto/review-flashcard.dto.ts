import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** FSRS ratings: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy. */
export class ReviewFlashcardDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4)
  rating!: 1 | 2 | 3 | 4;

  /** Seconds spent on the card (optional). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3600)
  timeTaken?: number;
}
