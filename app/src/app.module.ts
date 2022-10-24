import { Module } from '@nestjs/common';
import { RedisModule } from '@webeleon/nestjs-redis';
import { MongooseModule } from '@nestjs/mongoose';

const { REDIS_URI, MONGO_URL } = process.env;

@Module({
  imports: [
    RedisModule.forRoot({ url: REDIS_URI }),
    MongooseModule.forRoot(MONGO_URL),
  ],
})
export class AppModule {}
