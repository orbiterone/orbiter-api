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
        token: {
          _id: '$token._id',
          symbol: '$token.symbol',
          name: '$token.name',
          image: '$token.image',
          color: '$token.color',
        },
        txHash: 1,
        event: 1,
        status: 1,
        data: {
          amount: { $toString: '$data.amount' },
          error: '$data.error',
        },
        createdAt: 1,
      },
      [
        {
          $match: {
            user: user ? user._id : null,
          },
        },
        {
          $lookup: {
            from: 'tokens',
            localField: 'token',
            foreignField: '_id',
            as: 'token',
          },
        },
        {
          $unwind: {
            path: '$token',
          },
        },
      ],
      { limit: 20, order: 'DESC' },
    );
  }
}
