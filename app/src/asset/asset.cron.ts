import { Injectable } from '@nestjs/common';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import Web3 from 'web3';
import moment from 'moment';
import { Decimal } from 'decimal.js';

import { Decimal128 } from '@app/core/schemas/user.schema';
import { AssetService } from './asset.service';
import { NODE_TYPE, PRICE_FEED_OWNER_KEY } from '@app/core/constant';

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
      await this.wait(5000);
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
              await this.oTokenCore.balanceOfUnderlying(
                asset.oTokenAddress,
                user.address,
              ),
            ).div(Math.pow(10, asset.tokenDecimal));
            const totalBorrow = new Decimal(
              await this.oTokenCore.borrowBalanceCurrent(
                asset.oTokenAddress,
                user.address,
              ),
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

  // @Cron(CronExpression.EVERY_HOUR)
  @Timeout(5000)
  async updatePriceFeed() {
    console.log(`Job updatePriceFeed start - ${new Date()}`);
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
            symbol = 'KSM';
            break;
          case 'xcAUSD':
            symbol = 'AUSD';
            break;
          case 'xcKBTC':
            symbol = 'BTC';
            break;
        }
        if (symbol == 'MAI' || symbol == 'AUSD' || symbol == 'FRAX') continue;

        const price = await this.exchangeService.getPrice(symbol, 'USDT', 1);
        const parameter: any = {
          from: owner.address,
          to: this.oracleOrbiterCore.getToken(),
          data: oracleContract.methods
            .setUnderlyingPrice(
              asset.oTokenAddress,
              web3.utils.toWei(`${price}`, 'ether'),
            )
            .encodeABI(),
        };
        await this.web3Service.createTx(parameter, PRICE_FEED_OWNER_KEY);
      } catch (err) {
        console.log(err.message);
      }
    }
  }
}
