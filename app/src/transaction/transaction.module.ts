import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CoreModule } from '@app/core/core.module';
import {
  Transaction,
  TransactionSchema,
} from '@app/core/schemas/transaction.schema';
import { TransactionController } from './transaction.controller';
import { TransactionRepository } from './transaction.repository';
import { TransactionService } from './transaction.service';
import { UserModule } from '@app/user/user.module';

@Module({
  imports: [
    CoreModule,
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    UserModule,
  ],
  controllers: [TransactionController],
  providers: [TransactionService, TransactionRepository],
  exports: [TransactionService, TransactionRepository],
})
export class TransactionModule {}
