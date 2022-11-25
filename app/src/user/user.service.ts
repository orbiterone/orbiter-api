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
            $addFields: {
              totalSupplyUSD: {
                $multiply: ['$totalSupply', '$token.lastPrice'],
              },
              totalBorrowUSD: {
                $multiply: ['$totalBorrow', '$token.lastPrice'],
              },
            },
          },
          {
            $project: {
              totalSupplied: {
                $round: [{ $sum: 'totalSupplyUSD' }, 2],
              },
              totalBorrowed: {
                $round: [{ $sum: 'totalBorrowUSD' }, 2],
              },
              availableToBorrow: availableToBorrow
                ? availableToBorrow.toString()
                : '0',
              positionHealth: {
                coefficient:
                  availableToBorrow != 0
                    ? {
                        $round: [
                          {
                            $divide: [
                              availableToBorrow,
                              { $sum: 'totalBorrowUSD' },
                            ],
                          },
                          2,
                        ],
                      }
                    : '0',
                percentage:
                  availableToBorrow != 0
                    ? {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  { $sum: 'totalBorrowUSD' },
                                  availableToBorrow,
                                ],
                              },
                              100,
                            ],
                          },
                          0,
                        ],
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
