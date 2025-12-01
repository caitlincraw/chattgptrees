import { IsString, IsOptional } from 'class-validator';
import { CreateExampleDto } from './create-example.dto';

export class UpdateExampleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

