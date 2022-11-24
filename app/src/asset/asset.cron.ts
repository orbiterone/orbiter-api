import { Injectable } from '@nestjs/common';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import Web3 from 'web3';
import moment from 'moment';
import { Decimal } from 'decimal.js';

import { Decimal128 } from '@app/core/schemas/user.schema';
import { AssetService } from './asset.service';
import { NODE_TYPE } from '@app/core/constant';

const web3 = new Web3();

Decimal.set({ toExpNeg: -30, toExpPos: 30 });

@Injectable()
export class AssetCron extends AssetService {
  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateLastPrice() {
    console.log(`Job updateLastPrice start - ${new Date()}`);

    const assets = await this.assetRepository.find({});
    for (const asset of assets) {
      await this.assetRepository.getTokenModel().updateOne(
        { _id: asset._id },
        {
          $set: {
            lastPrice: Decimal128(
              web3.utils.fromWei(
                `${await this.oracleOrbiterCore.getUnderlyingPrice(
                  asset.oTokenAddress,
                )}`,
                'ether',
              ),
            ),
          },
        },
      );
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async updateAssetInfoFromBlockain() {
    console.log(`Job updateAssetInfoFromBlockain start - ${new Date()}`);

    const assets = await this.assetRepository.find({});
    for (const asset of assets) {
      await this.updateAssetInfo(asset.oTokenAddress);
      await this.wait(2000);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateAssetInfoByAccountFromBlockain() {
    console.log(
      `Job updateAssetInfoByAccountFromBlockain start - ${new Date()}`,
    );

    await this.userRepository
      .getUserModel()
      .find({ lastRequest: { $gte: moment().subtract(7, 'days').toDate() } })
      .cursor()
      .eachAsync(
        async (user) => {
          const assets = await this.assetRepository.find({});
          for (const asset of assets) {
            const totalSupply = new Decimal(
              await this.oTokenCore
                .setToken(asset.oTokenAddress)
                .balanceOfUnderlying(user.address),
            ).div(Math.pow(10, asset.tokenDecimal));
            const totalBorrow = new Decimal(
              await this.oTokenCore
                .setToken(asset.oTokenAddress)
                .borrowBalanceCurrent(user.address),
            ).div(Math.pow(10, asset.tokenDecimal));
            if (totalSupply.eq(0) && totalBorrow.eq(0)) continue;
            const objUpdateAsset = { $push: {} };
            if (totalSupply.gt(0) && !asset.suppliers.includes(user.address)) {
              objUpdateAsset.$push = Object.assign(objUpdateAsset.$push, {
                suppliers: user.address,
              });
            }
            if (totalBorrow.gt(0) && !asset.borrowers.includes(user.address)) {
              objUpdateAsset.$push = Object.assign(objUpdateAsset.$push, {
                borrowers: user.address,
              });
            }
            if (Object.keys(objUpdateAsset.$push).length) {
              await this.assetRepository
                .getTokenModel()
                .updateOne({ _id: asset._id }, { ...objUpdateAsset });
            }

            const collateral = await this.controllerOrbiterCore.checkMembership(
              user.address,
              asset.oTokenAddress,
            );

            await this.userRepository.getUserTokenModel().findOneAndUpdate(
              {
                user: user._id,
                token: asset._id,
              },
              {
                $set: {
                  user: user._id,
                  token: asset._id,
                  totalSupply: Decimal128(totalSupply.toString()),
                  totalBorrow: Decimal128(totalBorrow.toString()),
                  collateral,
                  typeNetwork: NODE_TYPE,
                },
              },
              { upsert: true },
            );
            await this.wait(1000);
          }
        },
        { parallel: 5 },
      );
  }
}
