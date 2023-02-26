import { Injectable } from '@nestjs/common';
import { TransactionResponse } from './interfaces/transaction.interface';

import { PaginatedDto } from '@app/core/interface/response';
import { User } from '@app/core/schemas/user.schema';
import { TransactionRepository } from './transaction.repository';

@Injectable()
export class TransactionService {
  constructor(public readonly transactionRepository: TransactionRepository) {}

  async transactions(
    user: User | null,
  ): Promise<PaginatedDto<TransactionResponse>> {
    return await this.transactionRepository.transactions(user);
  }
}
