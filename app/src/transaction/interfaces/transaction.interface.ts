import { ApiProperty } from '@nestjs/swagger';

class TokenInfoByTx {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  symbol: string;

  @ApiProperty()
  image: string;

  @ApiProperty()
  color: string;
}

export class TransactionResponse {
  @ApiProperty({ type: TokenInfoByTx })
  token: TokenInfoByTx;

  @ApiProperty()
  txHash: string;

  @ApiProperty()
  event: string;

  @ApiProperty()
  status: boolean;

  @ApiProperty()
  data: Record<string, any>;

  @ApiProperty()
  createdAt: Date;
}
