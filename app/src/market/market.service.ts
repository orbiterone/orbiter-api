import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import moment from 'moment';

import { AssetRepository } from '@app/asset/asset.repository';
import { Token } from '@app/core/schemas/token.schema';
import { Decimal128 } from '@app/core/schemas/user.schema';
import {
  MarketHistoryResponse,
  MarketOverviewResponse,
} from './interfaces/market.interface';
import { MarketRepository } from './market.repository';

@Injectable()
export class MarketService {
  constructor(
    private readonly marketRepository: MarketRepository,
    private readonly assetRepository: AssetRepository,
  ) {}

  async getMarketHistory(token: Token): Promise<MarketHistoryResponse[]> {
    const nowTime = moment().endOf('day').toDate();
    const subTwoMonth = moment().subtract(2, 'month').toDate();
    return (await this.marketRepository.find({
      select: 'supplyRate borrowRate totalSupply totalBorrow createdAt',
      options: {
        $and: [
          { token: token._id },
          { createdAt: { $gte: subTwoMonth } },
          { createdAt: { $lte: nowTime } },
        ],
      },
      sort: { createdAt: 1 },
    })) as unknown as MarketHistoryResponse[];
  }

  async getMarketOverview(): Promise<MarketOverviewResponse> {
    return (
      await this.assetRepository.getAggregateValue([
        {
          $addFields: {
            totalSupplyUSD: { $multiply: ['$totalSupply', '$lastPrice'] },
            totalBorrowUSD: { $multiply: ['$totalBorrow', '$lastPrice'] },
          },
        },
        {
          $facet: {
            maxSupply: [{ $sort: { totalSupplyUSD: -1 } }],
            maxBorrow: [{ $sort: { totalBorrowUSD: -1 } }],
          },
        },
        {
          $project: {
            totalSupplyAmount: {
              $toString: { $sum: '$maxSupply.totalSupplyUSD' },
            },
            totalBorrowAmount: {
              $toString: { $sum: '$maxBorrow.totalBorrowUSD' },
            },
            mostSupply: {
              _id: { $first: '$maxSupply._id' },
              name: { $first: '$maxSupply.name' },
              symbol: { $first: '$maxSupply.symbol' },
              image: { $first: '$maxSupply.image' },
            },
            mostBorrow: {
              _id: { $first: '$maxBorrow._id' },
              name: { $first: '$maxBorrow.name' },
              symbol: { $first: '$maxBorrow.symbol' },
              image: { $first: '$maxBorrow.image' },
            },
          },
        },
      ])
    ).pop();
  }

  @Cron('55 23 * * *')
  async createSnapshotByMarkets() {
    console.log(`Job createSnapshotByMarkets start - ${Date.now()}`);
    const assets = await this.assetRepository.find({});
    if (assets && assets.length) {
      for (const asset of assets) {
        await this.marketRepository.marketHistoryCreate({
          token: asset._id,
          supplyRate: Decimal128(asset.supplyRate.toString()),
          borrowRate: Decimal128(asset.borrowRate.toString()),
          totalSupply: Decimal128(asset.totalSupply.toString()),
          totalBorrow: Decimal128(asset.totalBorrow.toString()),
        });
      }
    }
  }
}
