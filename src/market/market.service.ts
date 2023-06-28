import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import moment from 'moment';

import { AssetRepository } from '@app/asset/asset.repository';
import { Token } from '@app/core/schemas/token.schema';
import { Decimal128 } from '@app/core/schemas/user.schema';
import {
  MarketHistoryResponse,
  MarketOverviewResponse,
  RatesResponse,
} from './interfaces/market.interface';
import { MarketRepository } from './market.repository';
import { ExchangeService } from '@app/core/exchange/exchange.service';

@Injectable()
export class MarketService {
  constructor(
    private readonly marketRepository: MarketRepository,
    private readonly assetRepository: AssetRepository,
    private readonly exchangeService: ExchangeService,
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
              $toString: { $round: [{ $sum: '$maxSupply.totalSupplyUSD' }, 2] },
            },
            totalBorrowAmount: {
              $toString: { $round: [{ $sum: '$maxBorrow.totalBorrowUSD' }, 2] },
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

  async getOrbRate(): Promise<number> {
    const WGLMR_ORB = await this.exchangeService.getPrice('WGLMR', 'ORB', 6);
    const WGLMR_USDC = await this.exchangeService.getPrice('WGLMR', 'USDC', 6);

    return WGLMR_USDC / WGLMR_ORB;
  }

  async rates(): Promise<Record<string, string>> {
    const results = await this.assetRepository
      .getTokenModel()
      .find({ isActive: true });

    const assets = {};
    if (results && results.length) {
      for (const item of results) {
        assets[item.symbol] = item.lastPrice;
      }
    }

    assets['ORB'] = (await this.getOrbRate()).toString();

    return assets;
  }
}
