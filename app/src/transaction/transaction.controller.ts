import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiKeyGuard } from '@app/core/guard/apikey';
import { TransactionService } from './transaction.service';

@Controller('transactions')
@UseGuards(ApiKeyGuard)
@ApiTags('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}
}
