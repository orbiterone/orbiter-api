import { ApiProperty } from '@nestjs/swagger';

class PrizePotLotteryInfo {
  @ApiProperty()
  orb: string;

  @ApiProperty()
  usd: string;
}

class PrizePotLooteryByGroupInfo extends PrizePotLotteryInfo {
  @ApiProperty()
  group: string;

  @ApiProperty({ required: false })
  winningTickets?: number;
}

export class CurrentLotteryResponse {
  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty()
  id: number;

  @ApiProperty()
  ticketPrice: string;

  @ApiProperty()
  totalUsers: number;

  @ApiProperty({ type: PrizePotLotteryInfo })
  prizePot: PrizePotLotteryInfo;

  @ApiProperty({ type: [PrizePotLooteryByGroupInfo] })
  prizeGroups: PrizePotLooteryByGroupInfo[];

  @ApiProperty({ type: PrizePotLotteryInfo })
  prizeBurn: PrizePotLotteryInfo;

  @ApiProperty()
  finalNumber: string;
}

export class UserLotteryResponse {
  @ApiProperty()
  startTime: Date;

  @ApiProperty()
  endTime: Date;

  @ApiProperty()
  id: number;

  @ApiProperty()
  finalNumber: string;

  @ApiProperty()
  countTickets: number;

  @ApiProperty()
  status: number;

  @ApiProperty()
  createdAt: Date;
}
