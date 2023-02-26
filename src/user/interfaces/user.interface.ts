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

  @ApiProperty()
  totalCollateral: string;

  @ApiProperty({ type: PositionHealth })
  positionHealth: PositionHealth;
}

export class UsersAccountsResponse {
  @ApiProperty()
  address: string;

  @ApiProperty()
  totalSupplyUSD: string;

  @ApiProperty()
  totalBorrowUSD: string;

  @ApiProperty()
  health: string;
}
