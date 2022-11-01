import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Token, TokenDocument } from '@app/core/schemas/token.schema';

@Injectable()
export class AssetRepository {
  constructor(
    @InjectModel(Token.name) private tokenModel: Model<TokenDocument>,
  ) {}

  getTokenModel(): Model<TokenDocument> {
    return this.tokenModel;
  }

  async tokenCreate(data: any): Promise<Token> {
    const createdToken = new this.tokenModel(data);
    return createdToken.save();
  }

  async find({
    options,
    select,
    sort,
  }: {
    options?: Record<string, any>;
    select?: string;
    sort?: Record<string, any>;
  }): Promise<Token[]> {
    return await this.tokenModel
      .find({ ...options })
      .select(select || '')
      .sort({ ...sort });
  }

  async getAggregateValue(value): Promise<any> {
    return this.tokenModel.aggregate([...value]);
  }
}
