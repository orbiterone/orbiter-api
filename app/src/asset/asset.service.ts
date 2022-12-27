import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import Web3 from 'web3';
import { BigNumber } from 'bignumber.js';
import { InjectRedisClient, RedisClient } from '@webeleon/nestjs-redis';
import { isEthereumAddress } from 'class-validator';

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
  AssetBalanceByAccountResponse,
  AssetByAccountResponse,
  AssetCompositionByAccountResponse,
  AssetEstimateMaxWithdrawalResponse,
  SupplyBorrowInfoByAssetAccount,
} from './interfaces/asset.interface';
import { UserRepository } from '@app/user/user.repository';
import { ExchangeService } from '@app/core/exchange/exchange.service';
import { ReaderOrbiterCore } from '@app/core/orbiter/reader.orbiter';

const web3 = new Web3();

const { NODE_TYPE } = process.env;

BigNumber.config({ EXPONENTIAL_AT: [-100, 100] });

@Injectable()
export class AssetService implements OnModuleInit {
  constructor(
    public readonly web3Service: Web3Service,
    public readonly exchangeService: ExchangeService,
    public readonly assetRepository: AssetRepository,
    public readonly oTokenCore: OTokenOrbiterCore,
    public readonly erc20OrbierCore: Erc20OrbiterCore,
    public readonly readerOrbiterCore: ReaderOrbiterCore,
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

    let underlying: string = null;
    if (oToken.toLowerCase() !== DEFAULT_TOKEN.toLowerCase()) {
      underlying = await this.oTokenCore.underlying(oToken);
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
      tokenData.name = await this.erc20OrbierCore.name(underlying);
      tokenData.symbol = await this.erc20OrbierCore.symbol(underlying);
      tokenData.tokenDecimal = +(await this.erc20OrbierCore.decimals(
        underlying,
      ));
      tokenData.color = SETTINGS[tokenData.symbol].color;
      tokenData.image = SETTINGS[tokenData.symbol].image;
      tokenData.fullName = SETTINGS[tokenData.symbol].fullName;
    }
    const collateralFactorMantissa =
      await this.controllerOrbiterCore.collateralFactorMantissa(oToken);

    const exchangeRate = new BigNumber(
      await this.oTokenCore.exchangeRateCurrent(oToken),
    ).div(new BigNumber(10).pow(18 + tokenData.tokenDecimal - 8));

    const oTokenDecimal = +(await this.oTokenCore.decimals(oToken));

    const totalSupply = new BigNumber(await this.oTokenCore.totalSupply(oToken))
      .div(new BigNumber(10).pow(oTokenDecimal))
      .multipliedBy(exchangeRate);
    const totalBorrow = new BigNumber(
      await this.oTokenCore.totalBorrows(oToken),
    ).div(new BigNumber(10).pow(tokenData.tokenDecimal));
    const totalReserves = new BigNumber(
      await this.oTokenCore.totalReserves(oToken),
    ).div(new BigNumber(10).pow(tokenData.tokenDecimal));
    const lastPrice = new BigNumber(
      `${await this.oracleOrbiterCore.getUnderlyingPrice(oToken)}`,
    )
      .div(new BigNumber(10).pow(36 - tokenData.tokenDecimal))
      .toString();

    const supplyApy = await this.oTokenCore.supplyApy(oToken);
    const borrowApy = await this.oTokenCore.borrowApy(oToken);

    let liquidity = new BigNumber(0);
    if (!underlying) {
      liquidity = new BigNumber(
        `${client.utils.fromWei(await client.eth.getBalance(oToken), 'ether')}`,
      );
    } else {
      liquidity = new BigNumber(
        await this.erc20OrbierCore.balanceOf(underlying, oToken),
      ).div(new BigNumber(10).pow(tokenData.tokenDecimal));
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
          `${await this.oTokenCore.reserveFactorMantissa(oToken)}`,
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
        await this.wait(5000);
      }
    }
  }

  async assetsList(): Promise<Token[]> {
    return await this.assetRepository.find({
      options: { isActive: true },
      sort: { name: 1 },
    });
  }

  async assetsByAccount(user: User | null): Promise<AssetByAccountResponse> {
    try {
      if (user) {
        const supplied = [];
        const borrowed = [];
        const assetList = await this.assetsList();
        const marketInfoByAccount =
          await this.readerOrbiterCore.marketInfoByAccount(user.address);
        for (const s of marketInfoByAccount.supplied.filter(
          (el) => +el.totalSupply > 0,
        )) {
          const asset = assetList.filter(
            (el) => el.oTokenAddress.toLowerCase() == s.oToken.toLowerCase(),
          )[0];
          supplied.push({
            token: {
              _id: asset._id,
              name: asset.name,
              symbol: asset.symbol,
              image: asset.image,
              apy: asset.supplyRate.toString(),
              tokenDecimal: asset.tokenDecimal,
              oTokenAddress: asset.oTokenAddress,
              tokenAddress: asset.tokenAddress,
              lastPrice: asset.lastPrice,
              exchangeRate: asset.exchangeRate,
            },
            collateral: s.collateral,
            value: new BigNumber(s.totalSupply)
              .div(Math.pow(10, asset.tokenDecimal))
              .toString(),
          });
        }

        for (const b of marketInfoByAccount.borrowed.filter(
          (el) => +el.totalBorrow > 0,
        )) {
          const asset = assetList.filter(
            (el) => el.oTokenAddress.toLowerCase() == b.oToken.toLowerCase(),
          )[0];
          borrowed.push({
            token: {
              _id: asset._id,
              name: asset.name,
              symbol: asset.symbol,
              image: asset.image,
              apy: asset.borrowRate.toString(),
              tokenDecimal: asset.tokenDecimal,
              oTokenAddress: asset.oTokenAddress,
              tokenAddress: asset.tokenAddress,
              lastPrice: asset.lastPrice,
              exchangeRate: asset.exchangeRate,
            },
            collateral: null,
            value: new BigNumber(b.totalBorrow)
              .div(Math.pow(10, asset.tokenDecimal))
              .toString(),
          });
        }

        const comprareFn = (
          infoA: SupplyBorrowInfoByAssetAccount,
          infoB: SupplyBorrowInfoByAssetAccount,
        ) => {
          const nameA = infoA.token.name.toUpperCase(); // ignore upper and lowercase
          const nameB = infoB.token.name.toUpperCase(); // ignore upper and lowercase
          if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }

          // names must be equal
          return 0;
        };

        return {
          supplied: supplied.sort(comprareFn),
          borrowed: borrowed.sort(comprareFn),
        };
      } else {
        return { supplied: [], borrowed: [] };
      }
    } catch (err) {
      console.log(err.message);
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
          { $match: { 'token.isActive': true } },
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
                    oTokenAddress: '$token.oTokenAddress',
                    tokenAddress: '$token.tokenAddress',
                    lastPrice: '$token.lastPrice',
                    exchangeRate: '$token.exchangeRate',
                  },
                  collateral: '$collateral',
                  value: {
                    $toString: {
                      $trunc: [
                        { $multiply: ['$totalSupply', '$token.exchangeRate'] },
                        '$token.tokenDecimal',
                      ],
                    },
                  },
                  valueOToken: { $toString: '$totalSupply' },
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
                    oTokenAddress: '$token.oTokenAddress',
                    tokenAddress: '$token.tokenAddress',
                    lastPrice: '$token.lastPrice',
                    exchangeRate: '$token.exchangeRate',
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
                  cond: { $gt: [{ $toDouble: '$$item.value' }, 0] },
                },
              },
              borrowed: {
                $filter: {
                  input: '$borrowed',
                  as: 'item',
                  cond: { $gt: [{ $toDouble: '$$item.value' }, 0] },
                },
              },
            },
          },
        ])
      ).pop() || { supplied: [], borrowed: [] };

      return { supplied, borrowed };
    }
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
        { $match: { 'token.isActive': true } },
        { $sort: { 'token.name': 1 } },
        {
          $group: {
            _id: null,
            totalSupplyUSD: {
              $sum: {
                $multiply: [
                  {
                    $multiply: ['$totalSupply', '$token.exchangeRate'],
                  },
                  '$token.lastPrice',
                ],
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
                usd: {
                  $multiply: [
                    {
                      $multiply: ['$totalSupply', '$token.exchangeRate'],
                    },
                    '$token.lastPrice',
                  ],
                },
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
                cond: { $gt: ['$$item.usd', Decimal128('0.1')] },
              },
            },
            borrowed: {
              $filter: {
                input: '$borrowed',
                as: 'item',
                cond: { $gt: ['$$item.usd', Decimal128('0.1')] },
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
                        6,
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
                        6,
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

  async estimateMaxWithdrawal(
    user: User | null,
    token: Token,
  ): Promise<AssetEstimateMaxWithdrawalResponse> {
    let max = '0';
    if (user) {
      const marketInfoByAccount =
        await this.readerOrbiterCore.marketInfoByAccount(user.address);

      const availableToWithdraw = web3.utils.fromWei(
        `${marketInfoByAccount.availableToBorrow}`,
        'ether',
      );
      let tokenSupplyUSD = '0';

      const filterSupply = marketInfoByAccount.supplied.filter(
        (el) =>
          el.oToken.toLowerCase() == token.oTokenAddress.toLowerCase() &&
          +el.totalSupply > 0,
      );
      if (filterSupply.length) {
        tokenSupplyUSD = new BigNumber(filterSupply[0].totalSupply)
          .div(Math.pow(10, token.tokenDecimal))
          .multipliedBy(token.lastPrice.toString())
          .toString();
      }

      const minUSD = BigNumber.min(availableToWithdraw, tokenSupplyUSD);

      max = minUSD
        .div(token.lastPrice.toString())
        .decimalPlaces(token.tokenDecimal)
        .toString();
    }

    return { max };
  }

  async assetsListForFaucet(
    user: User | null,
    userAddress: string,
  ): Promise<AssetBalanceByAccountResponse[]> {
    if (!isEthereumAddress(userAddress))
      throw new HttpException(
        'Address is not correct.',
        HttpStatus.BAD_REQUEST,
      );
    const assets = await this.assetRepository.find({
      select: 'tokenAddress image symbol fullName tokenDecimal oTokenAddress',
      options: { isActive: true },
      sort: { name: 1 },
    });
    const assetList = [];
    for (const asset of assets) {
      let balance = '0';
      if (user || userAddress) {
        if (asset.oTokenAddress.toLowerCase() == DEFAULT_TOKEN.toLowerCase()) {
          balance = new BigNumber(
            await this.web3Service
              .getClient()
              .eth.getBalance(user?.address || userAddress),
          )
            .div(new BigNumber(10).pow(asset.tokenDecimal))
            .toString();
        } else {
          balance = new BigNumber(
            await this.erc20OrbierCore.balanceOf(
              asset.tokenAddress,
              user?.address || userAddress,
            ),
          )
            .div(new BigNumber(10).pow(asset.tokenDecimal))
            .toString();
        }
      }
      assetList.push({
        token: {
          image: asset.image,
          symbol: asset.symbol,
          name: asset.fullName,
          tokenDecimal: asset.tokenDecimal,
          tokenAddress: asset.tokenAddress,
        },
        walletBalance: balance,
      });
    }
    return assetList;
  }

  async wait(ms: number): Promise<any> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
