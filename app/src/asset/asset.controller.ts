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
import { AssetService } from './asset.service';
import { ApiDataResponse } from '@app/core/interface/response';
import {
  AssetBalanceByAccountResponse,
  AssetByAccountResponse,
  AssetCompositionByAccountResponse,
  AssetInfoResponse,
} from './interfaces/asset.interface';
import { UserByAddressPipe } from '@app/core/pipes/user-by-address.pipe';
import { User } from '@app/core/schemas/user.schema';

@Controller('assets')
@UseGuards(ApiKeyGuard)
@ApiTags('assets')
@ApiExtraModels(
  AssetInfoResponse,
  AssetByAccountResponse,
  AssetCompositionByAccountResponse,
  AssetBalanceByAccountResponse,
)
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get('')
  @ApiDataResponse(AssetInfoResponse, 'array')
  async assets(@Response() res: any) {
    return res
      .status(HttpStatus.OK)
      .json(jsend.success(await this.assetService.assetsList()));
  }

  @Get(':account')
  @ApiDataResponse(AssetByAccountResponse)
  @ApiParam({ name: 'account', type: 'string' })
  async assetsByAccount(
    @Response() res: any,
    @Param('account', UserByAddressPipe) user: User | null,
  ) {
    return res
      .status(HttpStatus.OK)
      .json(jsend.success(await this.assetService.assetsByAccount(user)));
  }

  @Get(':account/composition')
  @ApiDataResponse(AssetCompositionByAccountResponse)
  @ApiParam({ name: 'account', type: 'string' })
  async assetsCompositionByAccount(
    @Response() res: any,
    @Param('account', UserByAddressPipe) user: User | null,
  ) {
    return res
      .status(HttpStatus.OK)
      .json(
        jsend.success(await this.assetService.assetsCompositionByAccount(user)),
      );
  }

  @Get(':account/balance')
  @ApiDataResponse(AssetBalanceByAccountResponse, 'array')
  @ApiParam({ name: 'account', type: 'string' })
  async assetsBalances(
    @Response() res: any,
    @Param('account', UserByAddressPipe) user: User | null,
  ) {
    return res
      .status(HttpStatus.OK)
      .json(jsend.success(await this.assetService.assetsListForFaucet(user)));
  }
}
