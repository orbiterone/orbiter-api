import { User } from '@app/core/schemas/user.schema';
import { Injectable } from '@nestjs/common';
import Web3 from 'web3';

import { UserRepository } from './user.repository';
import { ControllerOrbiterCore } from '@app/core/orbiter/controller.orbiter';
import { UserBalanceResponse } from '@app/user/interfaces/user.interface';
import { Decimal128 } from '@app/core/schemas/user.schema';
import { ReaderOrbiterCore } from '@app/core/orbiter/reader.orbiter';
import BigNumber from 'bignumber.js';

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
          percentage = +new BigNumber(
            new BigNumber(Math.floor(+totalBorrowed)).div(totalCollateral),
          )
            .multipliedBy(100)
            .toFixed(2);
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
                assurance: {
                  $sum: {
                    $multiply: [
                      {
                        $divide: [
                          { $multiply: ['$totalBorrow', '$token.lastPrice'] },
                          '$token.collateralFactor',
                        ],
                      },
                      100,
                    ],
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
                            $round: [
                              {
                                $multiply: [
                                  {
                                    $divide: [
                                      { $toInt: '$totalBorrowUSD' },
                                      collateral.totalCollateral,
                                    ],
                                  },
                                  100,
                                ],
                              },
                              2,
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
}
