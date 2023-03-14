import {
  Controller,
  Get,
  HttpStatus,
  Query,
  Response,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import jsend from 'jsend';

import { ApiKeyGuard } from '@app/core/guard/apikey';
import { LotteryService } from './lottery.service';
import { ApiDataResponse, BasePagination } from '@app/core/interface/response';
import { CurrentLotteryResponse } from './interfaces/lottery.interface';

@Controller('lotteries')
@UseGuards(ApiKeyGuard)
@ApiTags('lotteries')
export class LotteryController {
  constructor(private readonly lotteryService: LotteryService) {}

  @Get('current')
  @ApiDataResponse(CurrentLotteryResponse)
  async currentLottery(@Response() res: any) {
    return res
      .status(HttpStatus.OK)
      .json(jsend.success(await this.lotteryService.currentLottery()));
  }

  @Get('history')
  async historyLottery(@Response() res: any, @Query() query: BasePagination) {
    return res
      .status(HttpStatus.OK)
      .json(jsend.success(await this.lotteryService.historyLottery(query)));
  }
}
