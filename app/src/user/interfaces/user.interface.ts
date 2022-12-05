import { ApiProperty } from '@nestjs/swagger';

class PositionHealth {
  @ApiProperty()
  coefficient: string;

  @ApiProperty()
  percentage: string;
}

export class UserBalanceResponse {
  @ApiProperty()
  totalSupplied: string;

  @ApiProperty()
  totalBorrowed: string;

  @ApiProperty()
  assurance: string;

  @ApiProperty()
  availableToBorrow: string;

  @ApiProperty()
  totalCollateral: string;

  @ApiProperty({ type: PositionHealth })
  positionHealth: PositionHealth;
}
