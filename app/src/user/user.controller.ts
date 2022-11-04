import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Response,
  UseGuards,
} from '@nestjs/common';
import { ApiExtraModels, ApiParam, ApiTags } from '@nestjs/swagger';

import { ApiKeyGuard } from '@app/core/guard/apikey';
import { UserService } from './user.service';
import { ApiDataResponse } from '@app/core/interface/response';
import { UserByAddressPipe } from '@app/core/pipes/user-by-address.pipe';
import { User } from '@app/core/schemas/user.schema';
import { UserBalanceResponse } from '@app/user/interfaces/user.interface';
import jsend from 'jsend';

@Controller('users')
@UseGuards(ApiKeyGuard)
@ApiExtraModels(UserBalanceResponse)
@ApiTags('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':account')
  @ApiParam({ name: 'account', type: 'string' })
  @ApiDataResponse(UserBalanceResponse, 'object')
  async getUserAccountBalance(
    @Response() res: any,
    @Param('account', UserByAddressPipe) user: User | null,
  ) {
    return res
      .status(HttpStatus.OK)
      .json(jsend.success(await this.userService.getUserAccountBalance(user)));
  }
}
