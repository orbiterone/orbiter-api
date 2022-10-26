import {
  Controller,
  Get,
  HttpStatus,
  Response,
  UseGuards,
} from '@nestjs/common';
import { ApiExtraModels, ApiTags } from '@nestjs/swagger';
import jsend from 'jsend';

import { ApiKeyGuard } from '@app/core/guard/apikey';
import { AssetService } from './asset.service';
import { ApiDataResponse } from '@app/core/interface/response';
import { AssetInfoResponse } from './interfaces/asset.interface';

@Controller('assets')
@UseGuards(ApiKeyGuard)
@ApiTags('assets')
@ApiExtraModels(AssetInfoResponse)
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get('')
  @ApiDataResponse(AssetInfoResponse, 'array')
  async assets(@Response() res: any) {
    return res
      .status(HttpStatus.OK)
      .json(jsend.success(await this.assetService.assetsList()));
  }
}
