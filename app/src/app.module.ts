import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@webeleon/nestjs-redis';
import { MongooseModule } from '@nestjs/mongoose';

import { AssetModule } from './asset/asset.module';
import { MarketModule } from './market/market.module';

const { REDIS_URI, MONGO_URL } = process.env;

@Module({
  imports: [
    RedisModule.forRoot({ url: REDIS_URI }),
    MongooseModule.forRoot(MONGO_URL),
    ScheduleModule.forRoot(),
    AssetModule,
    MarketModule,
  ],
})
export class AppModule {}
