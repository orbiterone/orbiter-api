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
import { UserService } from './user.service';
import {
  ApiDataResponse,
  ApiPaginatedResponse,
  PaginatedDto,
} from '@app/core/interface/response';
import { UserByAddressPipe } from '@app/core/pipes/user-by-address.pipe';
import { User } from '@app/core/schemas/user.schema';
import {
  UserBalanceResponse,
  UsersAccountsResponse,
} from '@app/user/interfaces/user.interface';
import { UserAccountDto } from './interfaces/user.dto';

@Controller('users')
@UseGuards(ApiKeyGuard)
@ApiExtraModels(UserBalanceResponse, UsersAccountsResponse, PaginatedDto)
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

  @Get('')
  @ApiPaginatedResponse('entities', UsersAccountsResponse)
  async getUsersAccounts(@Response() res: any, @Query() query: UserAccountDto) {
    return res
      .status(HttpStatus.OK)
      .json(jsend.success(await this.userService.getUsersAccounts(query)));
  }
}
