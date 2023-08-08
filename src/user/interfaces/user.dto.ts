import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional } from 'class-validator';

export class UserAccountDto {
  @ApiProperty()
  @IsNumberString()
  page: string;

  @ApiProperty()
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  order: string;

  @ApiProperty()
  @IsEnum(['totalSupplyUSD', 'totalBorrowUSD', 'health'])
  @IsOptional()
  sort: string;

  @ApiProperty()
  @IsEnum(['safe', 'unsafe', 'risky'])
  @IsOptional()
  state: string;
}
