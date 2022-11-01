import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  TransactionDocument,
  Transaction,
} from '@app/core/schemas/transaction.schema';

@Injectable()
export class TransactionRepository {
  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  getTransactionModel(): Model<TransactionDocument> {
    return this.transactionModel;
  }

  async transactionCreate(data: any): Promise<Transaction> {
    const createdTx = new this.transactionModel(data);
    return createdTx.save();
  }
}
