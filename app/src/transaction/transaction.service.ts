import { Injectable } from '@nestjs/common';

import { TransactionRepository } from './transaction.repository';

@Injectable()
export class TransactionService {
  constructor(public readonly transactionRepository: TransactionRepository) {}
}
