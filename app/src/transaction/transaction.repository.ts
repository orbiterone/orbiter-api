import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  TransactionDocument,
  Transaction,
} from '@app/core/schemas/transaction.schema';
import { BaseRepository } from '@app/core/repositories/base.repository';
import { User } from '@app/core/schemas/user.schema';
import { PaginatedDto } from '@app/core/interface/response';
import { TransactionResponse } from './interfaces/transaction.interface';

@Injectable()
export class TransactionRepository extends BaseRepository {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {
    super();
  }

  getTransactionModel(): Model<TransactionDocument> {
    return this.transactionModel;
  }

  async transactionCreate(data: any): Promise<Transaction> {
    const createdTx = new this.transactionModel(data);
    return createdTx.save();
  }

  async transactions(
    user: User | null,
  ): Promise<PaginatedDto<TransactionResponse>> {
    return await this.pagination(
      this.transactionModel,
      {
        token: 1,
        txHash: 1,
        event: 1,
        status: 1,
        data: 1,
        createdAt: 1,
      },
      {
        user: user ? user._id : null,
      },
      { limit: 20, order: 'DESC' },
    );
  }
}
