import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CoreModule } from '@app/core/core.module';
import { MarketRepository } from './market.repository';
import {
  MarketHistory,
  MarketHistorySchema,
} from '@app/core/schemas/marketHistory.schema';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { AssetModule } from '@app/asset/asset.module';

@Module({
  imports: [
    CoreModule,
    MongooseModule.forFeature([
      { name: MarketHistory.name, schema: MarketHistorySchema },
    ]),
    forwardRef(() => AssetModule),
  ],
  controllers: [MarketController],
  providers: [MarketService, MarketRepository],
  exports: [MarketService, MarketRepository],
})
export class MarketModule {}
