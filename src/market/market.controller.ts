import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Response,
  UseGuards,
} from '@nestjs/common';
import { ApiExtraModels, ApiParam, ApiTags } from '@nestjs/swagger';
import jsend from 'jsend';

import { ApiKeyGuard } from '@app/core/guard/apikey';
import { TokenByIdPipe } from '@app/core/pipes/token-by-id.pipe';
import { Token } from '@app/core/schemas/token.schema';
import { MarketService } from './market.service';
import { ApiDataResponse } from '@app/core/interface/response';
import {
  MarketHistoryResponse,
  MarketOverviewResponse,
} from './interfaces/market.interface';

@Controller('markets')
@UseGuards(ApiKeyGuard)
@ApiExtraModels(MarketHistoryResponse, MarketOverviewResponse)
@ApiTags('markets')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('history/:tokenId')
  @ApiDataResponse(MarketHistoryResponse, 'array')
  @ApiParam({ name: 'tokenId', type: 'string' })
  async marketHistory(
    @Response() res: any,
    @Param('tokenId', TokenByIdPipe) token: Token,
  ) {
    return res
      .status(HttpStatus.OK)
      .json(jsend.success(await this.marketService.getMarketHistory(token)));
  }

  @Get('overview')
  @ApiDataResponse(MarketOverviewResponse, 'object')
  async marketOverview(@Response() res: any) {
    return res
      .status(HttpStatus.OK)
      .json(jsend.success(await this.marketService.getMarketOverview()));
  }
}
