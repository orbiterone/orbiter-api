import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  MarketHistory,
  MarketHistoryDocument,
} from '@app/core/schemas/marketHistory.schema';

@Injectable()
export class MarketRepository {
  constructor(
    @InjectModel(MarketHistory.name)
    private marketHistoryModel: Model<MarketHistoryDocument>,
  ) {}

  getMarketHistoryModel(): Model<MarketHistoryDocument> {
    return this.marketHistoryModel;
  }

  async marketHistoryCreate(data: any): Promise<MarketHistory> {
    const createdMarket = new this.marketHistoryModel(data);
    return createdMarket.save();
  }

  async find({
    options,
    select,
    sort,
  }: {
    options?: Record<string, any>;
    select?: string;
    sort?: Record<string, any>;
  }): Promise<MarketHistory[]> {
    return await this.marketHistoryModel
      .find({ ...options })
      .select(select || '')
      .sort({ ...sort });
  }
}
