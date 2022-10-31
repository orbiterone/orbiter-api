import { ApiProperty } from '@nestjs/swagger';

export class MarketHistoryResponse {
  @ApiProperty()
  totalSupply: string;

  @ApiProperty()
  totalBorrow: string;

  @ApiProperty()
  supplyRate: string;

  @ApiProperty()
  borrowRate: string;

  @ApiProperty()
  createdAt: Date;
}

export class MarketOverviewResponse {
  @ApiProperty()
  totalSupply: string;

  @ApiProperty()
  totalBorrow: string;

  @ApiProperty()
  mostSuppliedAsset: string;

  @ApiProperty()
  mostBorrowedAsset: string;
}
