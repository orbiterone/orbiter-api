import { Injectable, OnModuleInit } from '@nestjs/common';
import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import { InjectRedisClient, RedisClient } from '@webeleon/nestjs-redis';

import { Web3Service } from '@app/core/web3/web3.service';
import { AssetRepository } from './asset.repository';
import { Decimal128, User } from '@app/core/schemas/user.schema';
import { DEFAULT_TOKEN, SUPPORT_MARKET, SETTINGS } from '@app/core/constant';
import { Token } from '@app/core/schemas/token.schema';
import { OTokenOrbiterCore } from '@app/core/orbiter/oToken.orbiter';
import { Erc20OrbiterCore } from '@app/core/orbiter/erc20.orbiter';
import { ControllerOrbiterCore } from '@app/core/orbiter/controller.orbiter';
import { OracleOrbiterCore } from '@app/core/orbiter/oracle.orbiter';
import {
  AssetByAccountResponse,
  AssetCompositionByAccountResponse,
} from './interfaces/asset.interface';
import { UserRepository } from '@app/user/user.repository';

const web3 = new Web3();

const { NODE_TYPE } = process.env;

@Injectable()
export class AssetService implements OnModuleInit {
  constructor(
    public readonly web3Service: Web3Service,
    public readonly assetRepository: AssetRepository,
    public readonly oTokenCore: OTokenOrbiterCore,
    public readonly erc20OrbierCore: Erc20OrbiterCore,
    public readonly controllerOrbiterCore: ControllerOrbiterCore,
    public readonly oracleOrbiterCore: OracleOrbiterCore,
    public readonly userRepository: UserRepository,
    @InjectRedisClient() private readonly redisClient: RedisClient,
  ) {
    (async () => {
      this.oracleOrbiterCore.setToken(
        await this.controllerOrbiterCore.oracle(),
      );
    })();
  }

  private async getAssetInfoFromBlockchain(oToken: string) {
    const client = this.web3Service.getClient();
    this.oTokenCore.setToken(oToken);

    let underlying: string = null;
    if (oToken.toLowerCase() !== DEFAULT_TOKEN.toLowerCase()) {
      underlying = await this.oTokenCore.underlying();
    }
    const tokenData = {
      name: ['moonriver', 'moonbase'].includes(NODE_TYPE)
        ? 'Moonriver'
        : 'Moonbeam',
      symbol: ['moonriver', 'moonbase'].includes(NODE_TYPE) ? 'MOVR' : 'GLMR',
      tokenDecimal: 18,
      color: ['moonriver', 'moonbase'].includes(NODE_TYPE)
        ? SETTINGS.MOVR.color
        : SETTINGS.GLMR.color,
      image: ['moonriver', 'moonbase'].includes(NODE_TYPE)
        ? SETTINGS.MOVR.image
        : SETTINGS.GLMR.image,
      fullName: ['moonriver', 'moonbase'].includes(NODE_TYPE)
        ? SETTINGS.MOVR.fullName
        : SETTINGS.GLMR.fullName,
    };
    if (underlying) {
      this.erc20OrbierCore.setToken(underlying);
      tokenData.name = await this.erc20OrbierCore.name();
      tokenData.symbol = await this.erc20OrbierCore.symbol();
      tokenData.tokenDecimal = +(await this.erc20OrbierCore.decimals());
      tokenData.color = SETTINGS[tokenData.symbol].color;
      tokenData.image = SETTINGS[tokenData.symbol].image;
      tokenData.fullName = SETTINGS[tokenData.symbol].fullName;
    }
    const collateralFactorMantissa =
      await this.controllerOrbiterCore.collateralFactorMantissa(oToken);

    const exchangeRate = new BigNumber(
      await this.oTokenCore.exchangeRateCurrent(),
    ).div(Math.pow(10, 18 + tokenData.tokenDecimal - 8));

    const oTokenDecimal = +(await this.oTokenCore.decimals());

    const totalSupply = new BigNumber(await this.oTokenCore.totalSupply())
      .div(Math.pow(10, oTokenDecimal))
      .multipliedBy(exchangeRate);
    const totalBorrow = new BigNumber(await this.oTokenCore.totalBorrows()).div(
      Math.pow(10, tokenData.tokenDecimal),
    );
    const totalReserves = new BigNumber(
      await this.oTokenCore.totalReserves(),
    ).div(Math.pow(10, tokenData.tokenDecimal));
    const lastPrice = web3.utils.fromWei(
      `${await this.oracleOrbiterCore.getUnderlyingPrice(oToken)}`,
      'ether',
    );

    const supplyApy = await this.oTokenCore.supplyApy();
    const borrowApy = await this.oTokenCore.borrowApy();

    let liquidity = new BigNumber(0);
    if (!underlying) {
      liquidity = new BigNumber(
        `${client.utils.fromWei(await client.eth.getBalance(oToken), 'ether')}`,
      );
    } else {
      liquidity = new BigNumber(
        await this.erc20OrbierCore.balanceOf(oToken),
      ).div(Math.pow(10, tokenData.tokenDecimal));
    }

    return {
      oTokenAddress: oToken,
      oTokenDecimal: oTokenDecimal,
      tokenAddress: underlying || '',
      ...tokenData,
      typeNetwork: NODE_TYPE,
      collateralFactor:
        +web3.utils.fromWei(`${collateralFactorMantissa}`, 'ether') * 100,
      reserveFactor:
        +web3.utils.fromWei(
          `${await this.oTokenCore.reserveFactorMantissa()}`,
          'ether',
        ) * 100,
      totalSupply: Decimal128(totalSupply.toString()),
      totalBorrow: Decimal128(totalBorrow.toString()),
      totalReserves: Decimal128(totalReserves.toString()),
      lastPrice: Decimal128(lastPrice),
      exchangeRate: Decimal128(exchangeRate.toString()),
      supplyRate: Decimal128(supplyApy.toString()),
      borrowRate: Decimal128(borrowApy.toString()),
      liquidity: Decimal128(liquidity.toString()),
      supplyPaused: await this.controllerOrbiterCore.mintGuardianPaused(oToken),
      borrowPaused: await this.controllerOrbiterCore.borrowGuardianPaused(
        oToken,
      ),
    };
  }

  async updateAssetInfo(oToken: string) {
    const assetInfo = await this.getAssetInfoFromBlockchain(oToken);
    await this.assetRepository.getTokenModel().findOneAndUpdate(
      {
        oTokenAddress: { $regex: oToken, $options: 'i' },
      },
      {
        $set: { ...assetInfo },
      },
      { upsert: true },
    );
  }

  async onModuleInit() {
    return;
    const supportMarkets = Object.values(SUPPORT_MARKET);
    if (supportMarkets && supportMarkets.length > 0) {
      for (const oToken of supportMarkets) {
        if (oToken == '') continue;
        await this.updateAssetInfo(oToken);
      }
    }
  }

  async assetsList(): Promise<Token[]> {
    return await this.assetRepository.find({
      sort: { name: 1 },
    });
  }

  async assetsByAccount(user: User | null): Promise<AssetByAccountResponse> {
    const { supplied = [], borrowed = [] } = (
      await this.assetRepository.getAggregateValueUserToken([
        {
          $match: {
            user: user ? user._id : null,
          },
        },
        {
          $lookup: {
            from: 'tokens',
            localField: 'token',
            foreignField: '_id',
            as: 'token',
          },
        },
        {
          $unwind: {
            path: '$token',
          },
        },
        { $sort: { 'token.name': 1 } },
        {
          $group: {
            _id: null,
            supplied: {
              $push: {
                token: {
                  _id: '$token._id',
                  name: '$token.name',
                  symbol: '$token.symbol',
                  image: '$token.image',
                  apy: { $toString: '$token.supplyRate' },
                  tokenDecimal: '$token.tokenDecimal',
                },
                collateral: '$collateral',
                value: { $toString: '$totalSupply' },
              },
            },
            borrowed: {
              $push: {
                token: {
                  _id: '$token._id',
                  name: '$token.name',
                  symbol: '$token.symbol',
                  image: '$token.image',
                  apy: { $toString: '$token.borrowRate' },
                  tokenDecimal: '$token.tokenDecimal',
                },
                collateral: '$collateral',
                value: { $toString: '$totalBorrow' },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            supplied: {
              $filter: {
                input: '$supplied',
                as: 'item',
                cond: { $gt: ['$$item.value', 0] },
              },
            },
            borrowed: {
              $filter: {
                input: '$borrowed',
                as: 'item',
                cond: { $gt: ['$$item.value', 0] },
              },
            },
          },
        },
      ])
    ).pop() || { supplied: [], borrowed: [] };

    return { supplied, borrowed };
  }

  async assetsCompositionByAccount(
    user: User | null,
  ): Promise<AssetCompositionByAccountResponse> {
    const { supplied = [], borrowed = [] } = (
      await this.assetRepository.getAggregateValueUserToken([
        {
          $match: {
            user: user ? user._id : null,
          },
        },
        {
          $lookup: {
            from: 'tokens',
            localField: 'token',
            foreignField: '_id',
            as: 'token',
          },
        },
        {
          $unwind: {
            path: '$token',
          },
        },
        { $sort: { 'token.name': 1 } },
        {
          $group: {
            _id: null,
            totalSupplyUSD: {
              $sum: {
                $multiply: ['$totalSupply', '$token.lastPrice'],
              },
            },
            totalBorrowUSD: {
              $sum: {
                $multiply: ['$totalBorrow', '$token.lastPrice'],
              },
            },
            supplied: {
              $push: {
                token: {
                  _id: '$token._id',
                  name: '$token.name',
                  symbol: '$token.symbol',
                  image: '$token.image',
                  color: '$token.color',
                },
                usd: { $multiply: ['$totalSupply', '$token.lastPrice'] },
              },
            },
            borrowed: {
              $push: {
                token: {
                  _id: '$token._id',
                  name: '$token.name',
                  symbol: '$token.symbol',
                  image: '$token.image',
                  color: '$token.color',
                },
                usd: { $multiply: ['$totalBorrow', '$token.lastPrice'] },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalSupplyUSD: 1,
            totalBorrowUSD: 1,
            supplied: {
              $filter: {
                input: '$supplied',
                as: 'item',
                cond: { $gt: ['$$item.usd', 0] },
              },
            },
            borrowed: {
              $filter: {
                input: '$borrowed',
                as: 'item',
                cond: { $gt: ['$$item.usd', 0] },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            supplied: {
              $map: {
                input: '$supplied',
                as: 'item',
                in: {
                  token: '$$item.token',
                  percent: {
                    $toString: {
                      $round: [
                        {
                          $divide: [
                            { $multiply: ['$$item.usd', 100] },
                            '$totalSupplyUSD',
                          ],
                        },
                        2,
                      ],
                    },
                  },
                },
              },
            },
            borrowed: {
              $map: {
                input: '$borrowed',
                as: 'item',
                in: {
                  token: '$$item.token',
                  percent: {
                    $toString: {
                      $round: [
                        {
                          $divide: [
                            { $multiply: ['$$item.usd', 100] },
                            '$totalBorrowUSD',
                          ],
                        },
                        2,
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      ])
    ).pop() || {
      supplied: [],
      borrowed: [],
    };

    return { supplied, borrowed };
  }

  async assetsListForFaucet(user: User | null) {
    const assets = await this.assetRepository.find({
      select: 'tokenAddress image symbol fullName tokenDecimal',
      options: {
        oTokenAddress: { $ne: DEFAULT_TOKEN },
      },
    });
    const assetList = [];
    for (const asset of assets) {
      let balance = '0';
      if (user) {
        const redisKey = asset.tokenAddress.toString() + user.address;
        const redisBalanceInfo = await this.redisClient.get(redisKey);

        if (redisBalanceInfo) {
          balance = redisBalanceInfo;
        } else {
          balance = new BigNumber(
            await this.erc20OrbierCore
              .setToken(asset.tokenAddress)
              .balanceOf(user.address),
          )
            .div(Math.pow(10, asset.tokenDecimal))
            .toString();
          this.redisClient.setEx(redisKey, 600, balance);
        }
      }
      assetList.push({
        token: {
          image: asset.image,
          symbol: asset.symbol,
          name: asset.fullName,
        },
        walletBalance: balance,
      });
    }
    return assetList;
  }
}
