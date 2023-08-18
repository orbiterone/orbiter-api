import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserModule } from '@app/user/user.module';
import { CoreModule } from '../core.module';
import { OrbiterModule } from '../orbiter/orbiter.module';
import { AssetModule } from '@app/asset/asset.module';
import { TransactionModule } from '@app/transaction/transaction.module';
import { LotteryModule } from '@app/lottery/lottery.module';
import { ControllerEventHandler } from './controller-event.handler';
import { LotteryEventHandler } from './lottery-event.handler';
import { MarketEventHandler } from './market-event.handler';

import {
  HandledBlockNumber,
  HandledBlockNumberSchema,
} from '../schemas/handled-block-number.schema';
import { TokenEventHandler } from './token-event.handler';
import { IncentiveEventHandler } from './incentive-event.handler';
import { NftEventHandler } from './nft-event.handler';
import { StakeNftEventHandler } from './stake-nft-event.handler';
import { HttpEventService } from './http-event.service';
import { LpEventHandler } from './lp-event.handler';

@Module({
  imports: [
    CoreModule,
    MongooseModule.forFeature([
      { name: HandledBlockNumber.name, schema: HandledBlockNumberSchema },
    ]),
    OrbiterModule,
    UserModule,
    AssetModule,
    TransactionModule,
    LotteryModule,
  ],
  providers: [
    ControllerEventHandler,
    LotteryEventHandler,
    MarketEventHandler,
    TokenEventHandler,
    IncentiveEventHandler,
    NftEventHandler,
    StakeNftEventHandler,
    HttpEventService,
    LpEventHandler,
  ],
  exports: [
    ControllerEventHandler,
    LotteryEventHandler,
    MarketEventHandler,
    TokenEventHandler,
    IncentiveEventHandler,
    NftEventHandler,
    StakeNftEventHandler,
    HttpEventService,
    LpEventHandler,
  ],
})
export class HttpEventModule {}
