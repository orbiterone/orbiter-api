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
  availableToBorrow: string;

  @ApiProperty({ type: PositionHealth })
  positionHealth: PositionHealth;
}
