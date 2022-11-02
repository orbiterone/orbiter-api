import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CoreModule } from '@app/core/core.module';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';
import { Token, TokenSchema } from '@app/core/schemas/token.schema';
import { AssetRepository } from './asset.repository';
import { OrbiterModule } from '@app/core/orbiter/orbiter.module';
import { UserModule } from '@app/user/user.module';

@Module({
  imports: [
    CoreModule,
    MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }]),
    OrbiterModule,
    UserModule,
  ],
  controllers: [AssetController],
  providers: [AssetService, AssetRepository],
  exports: [AssetService, AssetRepository],
})
export class AssetModule {}
