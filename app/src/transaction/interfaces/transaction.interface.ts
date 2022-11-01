import { ApiProperty } from '@nestjs/swagger';

export class TransactionResponse {
  @ApiProperty()
  token: string;

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
