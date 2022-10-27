import { ApiProperty } from '@nestjs/swagger';

export class AssetInfoResponse {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  symbol: string;

  @ApiProperty()
  oTokenDecimal: number;

  @ApiProperty()
  tokenDecimal: number;

  @ApiProperty()
  oTokenAddress: string;

  @ApiProperty()
  tokenAddress: string;

  @ApiProperty()
  typeNetwork: string;

  @ApiProperty()
  collateralFactor: number;

  @ApiProperty()
  reserveFactor: number;

  @ApiProperty()
  exchangeRate: string;

  @ApiProperty()
  supplyRate: string;

  @ApiProperty()
  borrowRate: string;

  @ApiProperty()
  totalSupply: string;

  @ApiProperty()
  totalBorrow: string;

  @ApiProperty()
  totalReserves: string;

  @ApiProperty()
  lastPrice: string;

  @ApiProperty()
  liquidity: string;

  @ApiProperty()
  suppliers: number;

  @ApiProperty()
  borrowers: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
