import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  Response,
  UseGuards,
} from '@nestjs/common';
import { ApiExtraModels, ApiParam, ApiTags } from '@nestjs/swagger';
import jsend from 'jsend';

import { ApiKeyGuard } from '@app/core/guard/apikey';
import { LotteryService } from './lottery.service';
import {
  ApiDataResponse,
  ApiPaginatedResponse,
  BasePagination,
} from '@app/core/interface/response';
import {
  CurrentLotteryResponse,
  TicketsUserByLotteryResponse,
  UserLotteryResponse,
} from './interfaces/lottery.interface';
import { UserByAddressPipe } from '@app/core/pipes/user-by-address.pipe';
import { User } from '@app/core/schemas/user.schema';
import { LotteryByIdPipe } from '@app/core/pipes/lottery-by-id.pipe';
import { Lottery } from '@app/core/schemas/lottery.schema';

@Controller('lotteries')
@UseGuards(ApiKeyGuard)
@ApiTags('lotteries')
@ApiExtraModels(
  CurrentLotteryResponse,
  UserLotteryResponse,
  TicketsUserByLotteryResponse,
)
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
  @ApiPaginatedResponse('entities', CurrentLotteryResponse)
  async historyLottery(@Response() res: any, @Query() query: BasePagination) {
    return res
      .status(HttpStatus.OK)
      .json(jsend.success(await this.lotteryService.historyLottery(query)));
  }

  @Get('history/:account')
  @ApiParam({ name: 'account', type: 'string' })
  @ApiPaginatedResponse('entities', UserLotteryResponse)
  async historyLotteryByAccount(
    @Response() res: any,
    @Query() query: BasePagination,
    @Param('account', UserByAddressPipe) user: User | null,
  ) {
    return res
      .status(HttpStatus.OK)
      .json(
        jsend.success(
          await this.lotteryService.historyLotteryByAccount(user, query),
        ),
      );
  }

  @Get('ticket/:lotteryId/:account')
  @ApiParam({ name: 'lotteryId', type: 'string' })
  @ApiParam({ name: 'account', type: 'string' })
  @ApiDataResponse(TicketsUserByLotteryResponse)
  async ticketsUserByLottery(
    @Response() res: any,
    @Param('account', UserByAddressPipe) user: User | null,
    @Param('lotteryId', LotteryByIdPipe) lottery: Lottery,
  ) {
    return res
      .status(HttpStatus.OK)
      .json(
        jsend.success(
          await this.lotteryService.ticketsUserByLottery(user, lottery),
        ),
      );
  }
}
