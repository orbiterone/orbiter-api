import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsNumberString, IsOptional } from 'class-validator';

export class UserAccountDto {
  @ApiProperty()
  @IsNumberString()
  page: string;

  @ApiProperty({ required: false })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  order?: string;

  @ApiProperty({ required: false })
  @IsEnum(['totalSupplyUSD', 'totalBorrowUSD', 'health'])
  @IsOptional()
  sort?: string;

  @ApiProperty({ required: false })
  @Type(() => String)
  @IsOptional()
  @Transform(({ value }) => String(value).split(','))
  @IsEnum(['safe', 'unsafe', 'risky'], { each: true })
  state?: string[];
}
