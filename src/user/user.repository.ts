import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { UserDocument, User } from '@app/core/schemas/user.schema';
import {
  UserToken,
  UserTokenDocument,
} from '@app/core/schemas/userToken.schema';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserToken.name)
    private userTokenModel: Model<UserTokenDocument>,
  ) {}

  getUserModel(): Model<UserDocument> {
    return this.userModel;
  }

  getUserTokenModel(): Model<UserTokenDocument> {
    return this.userTokenModel;
  }

  async findOneAndUpdate(data: { address: string }): Promise<User> {
    return await this.userModel.findOneAndUpdate(
      { address: { $regex: data.address, $options: 'i' } },
      { $set: { ...data } },
      { upsert: true, new: true },
    );
  }

  async getAggregateValueUserToken(value): Promise<any> {
    return this.userTokenModel.aggregate([...value]);
  }
}
