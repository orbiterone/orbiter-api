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
import { TransactionService } from './transaction.service';
import { UserByAddressPipe } from '@app/core/pipes/user-by-address.pipe';
import { User } from '@app/core/schemas/user.schema';
import {
  ApiPaginatedResponse,
  PaginatedDto,
} from '@app/core/interface/response';
import { TransactionResponse } from './interfaces/transaction.interface';

@Controller('transactions')
@UseGuards(ApiKeyGuard)
@ApiTags('transactions')
@ApiExtraModels(PaginatedDto, TransactionResponse)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get(':account')
  @ApiParam({ name: 'account', type: 'string' })
  @ApiPaginatedResponse('entities', TransactionResponse)
  async transactions(
    @Response() res: any,
    @Param('account', UserByAddressPipe) user: User | null,
  ) {
    return res
      .status(HttpStatus.OK)
      .json(jsend.success(await this.transactionService.transactions(user)));
  }
}
