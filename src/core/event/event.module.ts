import { Module } from '@nestjs/common';

import { UserModule } from '@app/user/user.module';
import { CoreModule } from '../core.module';
import { OrbiterModule } from '../orbiter/orbiter.module';
import { ControllerEvent } from './controller.event';
import { MarketEvent } from './market.event';
import { TokenEvent } from './token.event';
import { AssetModule } from '@app/asset/asset.module';
import { TransactionModule } from '@app/transaction/transaction.module';
import { LotteryModule } from '@app/lottery/lottery.module';
import { LotteryEvent } from './lottery.event';

@Module({
  imports: [
    CoreModule,
    OrbiterModule,
    UserModule,
    AssetModule,
    TransactionModule,
    LotteryModule,
  ],
  providers: [TokenEvent, MarketEvent, ControllerEvent, LotteryEvent],
  exports: [TokenEvent, MarketEvent, ControllerEvent, LotteryEvent],
})
export class EventModule {}
