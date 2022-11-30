import { User } from '@app/core/schemas/user.schema';
import { Injectable } from '@nestjs/common';
import Web3 from 'web3';

import { UserRepository } from './user.repository';
import { ControllerOrbiterCore } from '@app/core/orbiter/controller.orbiter';
import { UserBalanceResponse } from '@app/user/interfaces/user.interface';
import { Decimal128 } from '@app/core/schemas/user.schema';

const web3 = new Web3();

@Injectable()
export class UserService {
  constructor(
    public readonly userRepository: UserRepository,
    private readonly controllerOrbiterCore: ControllerOrbiterCore,
  ) {}

  async createUpdateGetUser(address: string): Promise<User> {
    return await this.userRepository.findOneAndUpdate({ address });
  }

  async getUserAccountBalance(user: User | null): Promise<UserBalanceResponse> {
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
          },
        },
        {
          $group: {
            _id: null,
            totalCollateral: {
              $sum: {
                $multiply: ['$token.collateralFactor', '$token.lastPrice'],
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
                    { $eq: ['$totalBorrowUSD', 0] },
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
        availableToBorrow: '0',
        positionHealth: { coefficient: '0', percentage: '0' },
      }
    );
  }
}
