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

@Module({
  imports: [
    CoreModule,
    MongooseModule.forFeature([
      { name: Lottery.name, schema: LotterySchema },
      { name: LotteryParticipant.name, schema: LotteryParticipantSchema },
    ]),
  ],
  controllers: [LotteryController],
  providers: [LotteryService, LotteryRepository],
  exports: [LotteryService, LotteryRepository],
})
export class LotteryModule {}
