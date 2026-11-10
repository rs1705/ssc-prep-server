import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Query string for GET /flashcards. Every filter is optional. */
export class FilterFlashcardsDto {
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(40)
  subject?: string;

  /** "vocab" | "idiom" | "ows" (case-insensitive). */
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(40)
  type?: string;

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(40)
  difficulty?: string;

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(60)
  exam?: string;

  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(10)
  year?: string;

  /** First letter of the word, e.g. "a". */
  @IsOptional()
  @Transform(trimmed)
  @Matches(/^[A-Za-z]$/, { message: 'alphabet must be a single letter' })
  alphabet?: string;

  /** Comma separated: tags=pyq,noun */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  highFrequency?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}
