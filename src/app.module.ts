import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@webeleon/nestjs-redis';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';

import { AssetModule } from './asset/asset.module';
import { MarketModule } from './market/market.module';
import { UserModule } from './user/user.module';
import { TransactionModule } from './transaction/transaction.module';
import { HttpEventModule } from './core/http-event/http-event.module';
import { HealthCheckModule } from './health-check/health-check.module';

const { REDIS_URI, MONGO_URL } = process.env;

@Module({
  imports: [
    RedisModule.forRoot({ url: REDIS_URI }),
    MongooseModule.forRoot(MONGO_URL),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    AssetModule,
    MarketModule,
    UserModule,
    HealthCheckModule,
    TransactionModule,
    HttpEventModule,
  ],
})
export class AppModule {}
