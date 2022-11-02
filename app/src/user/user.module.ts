import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CoreModule } from '@app/core/core.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema } from '@app/core/schemas/user.schema';
import { UserRepository } from './user.repository';
import { UserToken, UserTokenSchema } from '@app/core/schemas/userToken.schema';

@Module({
  imports: [
    CoreModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserToken.name, schema: UserTokenSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository, MongooseModule],
})
export class UserModule {}
