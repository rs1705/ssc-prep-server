import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SUBJECT_KEYS, type SubjectKey } from '../pyq.mapper';

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Every PYQ endpoint is scoped to one subject. */
export class SubjectQueryDto {
  @Transform(trimmed)
  @IsIn(SUBJECT_KEYS, {
    message: `subject must be one of: ${SUBJECT_KEYS.join(', ')}`,
  })
  subject!: SubjectKey;
}

/** GET /pyqs */
export class PyqQueryDto extends SubjectQueryDto {
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @MaxLength(60)
  topic?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
