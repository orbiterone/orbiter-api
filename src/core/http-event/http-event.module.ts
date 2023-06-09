import { Module } from '@nestjs/common';

import { UserModule } from '@app/user/user.module';
import { CoreModule } from '../core.module';
import { OrbiterModule } from '../orbiter/orbiter.module';
import { AssetModule } from '@app/asset/asset.module';
import { TransactionModule } from '@app/transaction/transaction.module';
import { LotteryModule } from '@app/lottery/lottery.module';
import { ControllerEventHandler } from './controller-event.handler';
import { LotteryEventHandler } from './lottery-event.handler';
import { MarketEventHandler } from './market-event.handler';

@Module({
  imports: [
    CoreModule,
    OrbiterModule,
    UserModule,
    AssetModule,
    TransactionModule,
    LotteryModule,
  ],
  providers: [ControllerEventHandler, LotteryEventHandler, MarketEventHandler],
  exports: [ControllerEventHandler, LotteryEventHandler, MarketEventHandler],
})
export class HttpEventModule {}
