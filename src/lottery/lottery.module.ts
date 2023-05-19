import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CoreModule } from '@app/core/core.module';
import { Lottery, LotterySchema } from '@app/core/schemas/lottery.schema';
import {
  LotteryParticipant,
  LotteryParticipantSchema,
} from '@app/core/schemas/lottery.participant.schema';
import { LotteryController } from './lottery.controller';
import { LotteryService } from './lottery.service';
import { LotteryRepository } from './lottery.repository';
import { UserModule } from '@app/user/user.module';
import { OrbiterModule } from '@app/core/orbiter/orbiter.module';
import { MarketModule } from '@app/market/market.module';
import { LotteryCron } from './lottery.cron';

@Module({
  imports: [
    CoreModule,
    UserModule,
    MarketModule,
    OrbiterModule,
    MongooseModule.forFeature([
      { name: Lottery.name, schema: LotterySchema },
      { name: LotteryParticipant.name, schema: LotteryParticipantSchema },
    ]),
  ],
  controllers: [LotteryController],
  providers: [LotteryService, LotteryRepository, LotteryCron],
  exports: [LotteryService, LotteryRepository, LotteryCron],
})
export class LotteryModule {}
