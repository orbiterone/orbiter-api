import { User } from '@app/core/schemas/user.schema';
import { Injectable } from '@nestjs/common';
import Web3 from 'web3';

import { UserRepository } from './user.repository';
import { ControllerOrbiterCore } from '@app/core/orbiter/controller.orbiter';

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

  async getUserAccountBalance(user) {
    const availableToBorrow = web3.utils.fromWei(
      `${
        (await this.controllerOrbiterCore.getAccountLiquidity(user.address))[0]
      }`,
      'ether',
    );
    return this.userRepository.getAggregateValueUserToken([
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
          totalSupplyUSD: { $multiply: ['$totalSupply', '$token.lastPrice'] },
          totalBorrowUSD: { $multiply: ['$totalBorrow', '$token.lastPrice'] },
        },
      },
      {
        $project: {
          totalSupplied: { $sum: 'totalSupplyUSD' },
          totalBorrowed: { $sum: 'totalBorrowUSD' },
          availableToBorrow,
          positionHealth: {
            coefficient: {
              $divide: [
                {
                  $multiply: ['$collateral', 0.01, { $sum: 'totalSupplyUSD' }],
                },
                { $sum: 'totalBorrowUSD' },
              ],
            },
            percentage: {
              $multiply: [
                {
                  $divide: [
                    { $sum: 'totalBorrowUSD' },
                    {
                      $multiply: [
                        '$collateral',
                        0.01,
                        { $sum: 'totalSupplyUSD' },
                      ],
                    },
                  ],
                },
                100,
              ],
            },
          },
        },
      },
    ]);
  }
}
