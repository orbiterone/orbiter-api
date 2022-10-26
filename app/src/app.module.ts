import { Module } from '@nestjs/common';
import { RedisModule } from '@webeleon/nestjs-redis';
import { MongooseModule } from '@nestjs/mongoose';

import { AssetModule } from './asset/asset.module';

const { REDIS_URI, MONGO_URL } = process.env;

@Module({
  imports: [
    RedisModule.forRoot({ url: REDIS_URI }),
    MongooseModule.forRoot(MONGO_URL),
    AssetModule,
  ],
})
export class AppModule {}
