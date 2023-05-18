import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CoreModule } from '@app/core/core.module';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';
import { Token, TokenSchema } from '@app/core/schemas/token.schema';
import { AssetRepository } from './asset.repository';
import { OrbiterModule } from '@app/core/orbiter/orbiter.module';
import { UserModule } from '@app/user/user.module';
import { AssetCron } from './asset.cron';
import { MarketModule } from '@app/market/market.module';

@Module({
  imports: [
    CoreModule,
    MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }]),
    forwardRef(() => MarketModule),
    OrbiterModule,
    UserModule,
  ],
  controllers: [AssetController],
  providers: [AssetService, AssetRepository, AssetCron],
  exports: [AssetService, AssetRepository, AssetCron],
})
export class AssetModule {}
