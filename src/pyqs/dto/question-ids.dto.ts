import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

/** POST /mocks/questions */
export class QuestionIdsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(150)
  @IsUUID('all', { each: true })
  ids!: string[];
}
