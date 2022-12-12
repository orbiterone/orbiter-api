import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@webeleon/nestjs-redis';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';

import { AssetModule } from './asset/asset.module';
import { MarketModule } from './market/market.module';
import { EventModule } from './core/event/event.module';
import { UserModule } from './user/user.module';
import { TransactionModule } from './transaction/transaction.module';

const { REDIS_URI, MONGO_URL } = process.env;

@Module({
  imports: [
    RedisModule.forRoot({ url: REDIS_URI }),
    MongooseModule.forRoot(MONGO_URL),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    EventModule,
    AssetModule,
    MarketModule,
    UserModule,
    TransactionModule,
  ],
})
export class AppModule {}
