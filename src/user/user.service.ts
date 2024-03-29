import { User } from '@app/core/schemas/user.schema';
import { Injectable } from '@nestjs/common';
import Web3 from 'web3';

import { UserRepository } from './user.repository';
import { ControllerOrbiterCore } from '@app/core/orbiter/controller.orbiter';
import {
  UserBalanceResponse,
  UsersAccountsResponse,
} from '@app/user/interfaces/user.interface';
import { Decimal128 } from '@app/core/schemas/user.schema';
import { ReaderOrbiterCore } from '@app/core/orbiter/reader.orbiter';
import BigNumber from 'bignumber.js';
import { UserAccountDto } from './interfaces/user.dto';
import { PaginatedDto } from '@app/core/interface/response';

const web3 = new Web3();

@Injectable()
export class UserService {
  constructor(
    public readonly userRepository: UserRepository,
    private readonly controllerOrbiterCore: ControllerOrbiterCore,
    private readonly readerOrbiterCore: ReaderOrbiterCore,
  ) {}

  async createUpdateGetUser(address: string): Promise<User> {
    return await this.userRepository.findOneAndUpdate({ address });
  }

  async getUserAccountBalance(user: User | null): Promise<UserBalanceResponse> {
    try {
      if (user) {
        const marketInfoByAccount =
          await this.readerOrbiterCore.marketInfoByAccount(user.address);

        const totalSupplied = web3.utils.fromWei(
          `${marketInfoByAccount.totalSupply}`,
          'ether',
        );
        const totalBorrowed = web3.utils.fromWei(
          `${marketInfoByAccount.totalBorrow}`,
          'ether',
        );
        const totalCollateral = web3.utils.fromWei(
          `${marketInfoByAccount.totalCollateral}`,
          'ether',
        );
        const availableToBorrow = web3.utils.fromWei(
          `${marketInfoByAccount.availableToBorrow}`,
          'ether',
        );

        let coefficient = 0;
        let percentage = 0;
        if (
          +Number(totalBorrowed).toFixed(3) == 0 ||
          +totalCollateral / +totalBorrowed >= 100
        ) {
          coefficient = 100;
        } else {
          coefficient = new BigNumber(totalCollateral)
            .div(totalBorrowed)
            .toNumber();
        }

        if (+totalCollateral > 0) {
          percentage = new BigNumber(
            new BigNumber(totalBorrowed).div(totalCollateral),
          )
            .multipliedBy(100)
            .toNumber();
        }

        if (percentage > 100) {
          percentage = 100;
        }

        return {
          totalSupplied,
          totalBorrowed,
          totalCollateral,
          availableToBorrow,
          positionHealth: {
            coefficient: coefficient.toString(),
            percentage: percentage.toString(),
          },
        };
      } else {
        return {
          totalSupplied: '0',
          totalBorrowed: '0',
          totalCollateral: '0',
          availableToBorrow: '0',
          positionHealth: { coefficient: '0', percentage: '0' },
        };
      }
    } catch (err) {
      console.log(err.message);
      let availableToBorrow;
      if (user) {
        availableToBorrow = Decimal128(
          web3.utils.fromWei(
            `${await this.controllerOrbiterCore.getAccountLiquidity(
              user.address,
            )}`,
            'ether',
          ),
        );
      }

      const collateral = (
        await this.userRepository.getAggregateValueUserToken([
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
          {
            $match: {
              collateral: true,
              'token.isActive': true,
            },
          },
          {
            $group: {
              _id: null,
              totalCollateral: {
                $sum: {
                  $multiply: [
                    {
                      $multiply: [
                        {
                          $trunc: [
                            {
                              $multiply: [
                                '$totalSupply',
                                '$token.exchangeRate',
                              ],
                            },
                            '$token.tokenDecimal',
                          ],
                        },
                        {
                          $divide: ['$token.collateralFactor', 100],
                        },
                      ],
                    },
                    '$token.lastPrice',
                  ],
                },
              },
            },
          },
        ])
      ).pop() || { totalCollateral: Decimal128('0') };

      return (
        (
          await this.userRepository.getAggregateValueUserToken([
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
            {
              $match: {
                'token.isActive': true,
              },
            },
            {
              $group: {
                _id: null,
                totalSupplyUSD: {
                  $sum: {
                    $multiply: [
                      {
                        $trunc: [
                          {
                            $multiply: ['$totalSupply', '$token.exchangeRate'],
                          },
                          '$token.tokenDecimal',
                        ],
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
              },
            },
            {
              $project: {
                _id: 0,
                totalSupplied: { $toString: '$totalSupplyUSD' },
                totalBorrowed: { $toString: '$totalBorrowUSD' },
                availableToBorrow: availableToBorrow
                  ? availableToBorrow.toString()
                  : '0',
                totalCollateral: collateral.totalCollateral.toString(),
                positionHealth: {
                  coefficient: {
                    $cond: [
                      { $eq: [{ $round: ['$totalBorrowUSD', 3] }, 0] },
                      '100',
                      {
                        $cond: [
                          {
                            $gte: [
                              {
                                $divide: [
                                  collateral.totalCollateral,
                                  '$totalBorrowUSD',
                                ],
                              },
                              100,
                            ],
                          },
                          '100',
                          {
                            $toString: {
                              $divide: [
                                collateral.totalCollateral,
                                '$totalBorrowUSD',
                              ],
                            },
                          },
                        ],
                      },
                    ],
                  },
                  percentage:
                    collateral.totalCollateral != 0
                      ? {
                          $toString: {
                            $multiply: [
                              {
                                $divide: [
                                  '$totalBorrowUSD',
                                  collateral.totalCollateral,
                                ],
                              },
                              100,
                            ],
                          },
                        }
                      : '0',
                },
              },
            },
          ])
        ).pop() || {
          totalSupplied: '0',
          totalBorrowed: '0',
          totalCollateral: '0',
          availableToBorrow: '0',
          positionHealth: { coefficient: '0', percentage: '0' },
        }
      );
    }
  }

  async getUsersAccounts(
    query: UserAccountDto,
    maxHealth = '2',
    perPage = 10,
  ): Promise<PaginatedDto<UsersAccountsResponse>> {
    const pageItem = +query.page || 1;
    const skip = (pageItem - 1) * perPage;
    const sort = query.sort || 'health';
    const order = query.order && query.order == 'asc' ? 1 : -1;

    const healthMatch: any = {
      health: {
        $lte: Decimal128(maxHealth),
      },
    };

    let result = (
      await this.userRepository.getAggregateValueUserToken([
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
        {
          $match: {
            'token.isActive': true,
          },
        },
        {
          $group: {
            _id: '$user',
            totalCollateral: {
              $sum: {
                $cond: [
                  { $eq: ['$collateral', true] },
                  {
                    $multiply: [
                      {
                        $multiply: [
                          {
                            $trunc: [
                              {
                                $multiply: [
                                  '$totalSupply',
                                  '$token.exchangeRate',
                                ],
                              },
                              '$token.tokenDecimal',
                            ],
                          },
                          {
                            $divide: ['$token.collateralFactor', 100],
                          },
                        ],
                      },
                      '$token.lastPrice',
                    ],
                  },
                  0,
                ],
              },
            },
            totalSupplyUSD: {
              $sum: {
                $multiply: [
                  {
                    $trunc: [
                      {
                        $multiply: ['$totalSupply', '$token.exchangeRate'],
                      },
                      '$token.tokenDecimal',
                    ],
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
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: {
            path: '$user',
          },
        },
        {
          $project: {
            _id: 0,
            address: '$user.address',
            totalSupplyUSD: 1,
            totalBorrowUSD: 1,
            health: {
              $cond: [
                { $eq: [{ $round: ['$totalBorrowUSD', 3] }, Decimal128('0')] },
                Decimal128('100'),
                {
                  $cond: [
                    {
                      $gte: [
                        {
                          $divide: ['$totalCollateral', '$totalBorrowUSD'],
                        },
                        Decimal128('100'),
                      ],
                    },
                    Decimal128('100'),
                    {
                      $divide: ['$totalCollateral', '$totalBorrowUSD'],
                    },
                  ],
                },
              ],
            },
          },
        },
        {
          $project: {
            address: 1,
            totalSupplyUSD: 1,
            totalBorrowUSD: 1,
            health: 1,
            healthString: {
              $cond: {
                if: { $lte: ['$health', Decimal128('0.985')] },
                then: 'unsafe',
                else: {
                  $cond: {
                    if: {
                      $and: [
                        { $gt: ['$health', Decimal128('0.985')] },
                        { $lte: ['$health', Decimal128('1.25')] },
                      ],
                    },
                    then: 'risky',
                    else: {
                      $cond: {
                        if: {
                          $and: [
                            {
                              $gt: ['$health', Decimal128('1.25')],
                            },
                            {
                              $lte: ['$health', Decimal128(maxHealth)],
                            },
                          ],
                        },
                        then: 'safe',
                        else: 'safe',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        {
          $match: {
            $and: [
              {
                totalBorrowUSD: {
                  $gt: Decimal128('0'),
                },
              },
              query.state
                ? { healthString: { $in: query.state } }
                : { ...healthMatch },
            ],
          },
        },
        {
          $sort: { [`${sort}`]: order },
        },
        {
          $facet: {
            total: [
              {
                $count: 'count',
              },
            ],
            items: [
              { $skip: skip },
              { $limit: perPage },
              {
                $project: {
                  _id: 0,
                  address: 1,
                  totalSupplyUSD: { $toString: '$totalSupplyUSD' },
                  totalBorrowUSD: { $toString: '$totalBorrowUSD' },
                  health: { $toString: '$health' },
                  healthString: 1,
                },
              },
            ],
          },
        },
        { $unwind: '$total' },
        {
          $project: {
            page: pageItem.toString(),
            pages: {
              $ceil: { $divide: ['$total.count', perPage] },
            },
            countItem: '$total.count',
            entities: '$items',
          },
        },
      ])
    ).pop();

    if (result && result.entities && result.entities.length) {
      for (const i in result.entities) {
        const item = result.entities[i];
        const user = new User();
        user.address = item.address;
        const actualInfo = await this.getUserAccountBalance(user);

        result.entities[i].totalSupplyUSD = actualInfo.totalSupplied;
        result.entities[i].totalBorrowUSD = actualInfo.totalBorrowed;
        result.entities[i].health = actualInfo.positionHealth.coefficient;
      }
    } else {
      result = {
        entities: [],
        page: pageItem.toString(),
        pages: 0,
        countItem: 0,
      };
    }

    return result;
  }
}
