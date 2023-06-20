import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import moment from 'moment';
import { BigNumber } from 'bignumber.js';

import { Decimal128 } from '@app/core/schemas/user.schema';
import { AssetService } from './asset.service';
import {
  NODE_TYPE,
  PRICE_FEED_OWNER_KEY,
  PRICE_FEED_UPDATE,
} from '@app/core/constant';

const { DISCORD_WEBHOOK_LIQUIDATOR } = process.env;

BigNumber.config({ EXPONENTIAL_AT: [-100, 100] });

@Injectable()
export class AssetCron extends AssetService {
  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateLastPrice() {
    console.log(`Job updateLastPrice start - ${new Date()}`);

    const assets = await this.assetRepository.find({});
    for (const asset of assets) {
      try {
        await this.assetRepository.getTokenModel().updateOne(
          { _id: asset._id },
          {
            $set: {
              lastPrice: Decimal128(
                new BigNumber(
                  `${await this.oracleOrbiterCore.getUnderlyingPrice(
                    asset.oTokenAddress,
                  )}`,
                )
                  .div(new BigNumber(10).pow(36 - asset.tokenDecimal))
                  .toString(),
              ),
            },
          },
        );
      } catch (err) {
        console.error(err);
      }
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async updateExchangeRateByAssets() {
    console.log(`Job updateExchangeRateByAssets start - ${new Date()}`);

    const assets = await this.assetRepository.find({});
    for (const asset of assets) {
      try {
        const exchangeRate = new BigNumber(
          await this.oTokenCore.exchangeRateCurrent(asset.oTokenAddress),
        ).div(new BigNumber(10).pow(18 + asset.tokenDecimal - 8));

        await this.assetRepository.getTokenModel().updateOne(
          { _id: asset._id },
          {
            $set: {
              exchangeRate: Decimal128(exchangeRate.toString()),
            },
          },
        );

        await this.wait(1000);
      } catch (err) {
        console.error(err);
      }
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async updateAssetInfoFromBlockain() {
    console.log(`Job updateAssetInfoFromBlockain start - ${new Date()}`);

    const assets = await this.assetRepository.find({});
    for (const asset of assets) {
      try {
        await this.updateAssetInfo(asset.oTokenAddress);
        await this.wait(5000);
      } catch (err) {
        console.error(err);
      }
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
            try {
              const totalSupply = new BigNumber(
                await this.oTokenCore.balanceOf(
                  asset.oTokenAddress,
                  user.address,
                ),
              ).div(new BigNumber(10).pow(asset.oTokenDecimal));
              const totalBorrow = new BigNumber(
                await this.oTokenCore.borrowBalanceCurrent(
                  asset.oTokenAddress,
                  user.address,
                ),
              ).div(new BigNumber(10).pow(asset.tokenDecimal));
              if (totalSupply.eq(0) && totalBorrow.eq(0)) continue;
              const objUpdateAsset = { $push: {} };
              if (
                totalSupply.gt(0) &&
                !asset.suppliers.includes(user.address)
              ) {
                objUpdateAsset.$push = Object.assign(objUpdateAsset.$push, {
                  suppliers: user.address,
                });
              }
              if (
                totalBorrow.gt(0) &&
                !asset.borrowers.includes(user.address)
              ) {
                objUpdateAsset.$push = Object.assign(objUpdateAsset.$push, {
                  borrowers: user.address,
                });
              }
              if (Object.keys(objUpdateAsset.$push).length) {
                await this.assetRepository
                  .getTokenModel()
                  .updateOne({ _id: asset._id }, { ...objUpdateAsset });
              }

              const collateral =
                await this.controllerOrbiterCore.checkMembership(
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
              await this.wait(5000);
            } catch (err) {
              console.error(err);
            }
          }
        },
        { parallel: 5 },
      );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updatePriceFeed() {
    console.log(`Job updatePriceFeed start - ${new Date()}`);
    if (PRICE_FEED_UPDATE == 'false') return;
    if (NODE_TYPE != 'moonbase') return;
    const assets = await this.assetRepository.find({});
    const oracleContract = this.oracleOrbiterCore.contract();

    const owner = this.web3Service
      .getClient()
      .eth.accounts.privateKeyToAccount(PRICE_FEED_OWNER_KEY);

    for (const asset of assets) {
      try {
        let symbol = asset.symbol;
        switch (symbol) {
          case 'xcKSM':
          case 'wstKSM':
            symbol = 'KSM';
            break;
          case 'xcAUSD':
            symbol = 'AUSD';
            break;
          case 'xcKBTC':
            symbol = 'BTC';
            break;
          case 'd2o':
            symbol = 'USDC';
        }
        if (symbol == 'MAI' || symbol == 'AUSD' || symbol == 'FRAX') continue;

        const price = await this.exchangeService.getPrice(symbol, 'USDT', 1);
        const parameter: any = {
          from: owner.address,
          to: this.oracleOrbiterCore.getToken(),
          data: oracleContract.methods
            .setUnderlyingPrice(
              asset.oTokenAddress,
              new BigNumber(`${price}`)
                .multipliedBy(new BigNumber(10).pow(36 - asset.tokenDecimal))
                .toString(),
            )
            .encodeABI(),
        };
        await this.web3Service.createTx(parameter, PRICE_FEED_OWNER_KEY);
        await this.wait(30000);
      } catch (err) {
        console.error(err);
      }
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async liquidationLogger() {
    const users = await this.userService.getUsersAccounts(
      { page: '1' },
      '1.5',
      1000,
    );
    if (users && users.entities && users.entities.length) {
      let i = 0;
      let count = 0;
      let message = '';
      for (const user of users.entities) {
        i++;
        count++;
        message += `:white_check_mark: address: ${user.address}, health: ${user.health}, supply: ${user.totalSupplyUSD} $, borrow: ${user.totalBorrowUSD}$ \n`;
        if (i == 5 || (i < 5 && users.entities.length == count)) {
          await this.discordService.sendNotification(
            DISCORD_WEBHOOK_LIQUIDATOR,
            message,
          );
          i = 0;
          message = '';
        }
      }
    }
  }
}
