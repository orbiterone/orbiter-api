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
    const assets = await this.assetRepository.find({});
    let totalSupplyUSD = 0;
    let totalBorrowUSD = 0;
    let mostSuppliedAsset;
    let mostBorrowedAsset;
    if (assets && assets.length) {
      for (const asset of assets) {
        totalSupplyUSD +=
          Number(asset.totalSupply.toString()) * Number(asset.lastPrice);
        totalBorrowUSD +=
          Number(asset.totalBorrow.toString()) * Number(asset.lastPrice);
      }
      mostSuppliedAsset = assets.reduce((prev, curr) =>
        Number(prev.totalSupply.toString()) * Number(prev.lastPrice) >
        Number(curr.totalSupply.toString()) * Number(curr.lastPrice)
          ? prev
          : curr,
      );
      mostBorrowedAsset = assets.reduce((prev, curr) =>
        Number(prev.totalBorrow.toString()) * Number(prev.lastPrice) >
        Number(curr.totalBorrow.toString()) * Number(curr.lastPrice)
          ? prev
          : curr,
      );
    }
    return {
      totalSupply: totalSupplyUSD.toFixed(2),
      totalBorrow: totalBorrowUSD.toFixed(2),
      mostSuppliedAsset: mostSuppliedAsset.name,
      mostBorrowedAsset: mostBorrowedAsset.name,
    };
  }

  @Cron('55 23 * * *')
  async createSnapshotByMarkets() {
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
