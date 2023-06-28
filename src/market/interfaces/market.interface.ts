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

class MostBorrowOrSupply {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  symbol: string;

  @ApiProperty()
  image: string;
}

export class MarketOverviewResponse {
  @ApiProperty()
  totalSupplyAmount: string;

  @ApiProperty()
  totalBorrowAmount: string;

  @ApiProperty({ type: MostBorrowOrSupply })
  mostSupply: MostBorrowOrSupply;

  @ApiProperty({ type: MostBorrowOrSupply })
  mostBorrow: MostBorrowOrSupply;
}

export class RatesResponse {
  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  data: Record<string, string>;
}
