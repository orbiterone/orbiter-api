import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiKeyGuard } from '@app/core/guard/apikey';
import { LotteryService } from './lottery.service';

@Controller('lotteries')
@UseGuards(ApiKeyGuard)
@ApiTags('lotteries')
export class LotteryController {
  constructor(private readonly lotteryService: LotteryService) {}
}
