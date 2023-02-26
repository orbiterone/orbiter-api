import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

export class UserAccountDto {
  @ApiProperty()
  @IsNumberString()
  page: string;
}
