import { Injectable, OnModuleInit } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { Log } from 'web3-core';

import { LP } from '../constant';
import { LP_EVENT } from '../event/interfaces/event.interface';
import { Decimal128 } from '../schemas/user.schema';
import { HttpEventAbstractService } from './http-event.abstract.service';
import { HttpEventListener } from './interfaces/http-event.interface';

const { NODE_TYPE_LOTTERY: typeNetwork } = process.env;

@Injectable()
export class LpEventHandler
  extends HttpEventAbstractService
  implements OnModuleInit
{
  private topics = {
    [`${this.web3.utils.sha3('Staked(address,uint256)')}`]: LP_EVENT.STAKING,
    [`${this.web3.utils.sha3('Unstaked(address,uint256)')}`]:
      LP_EVENT.UNSTAKING,
    [`${this.web3.utils.sha3('Claimed(address,address,uint256)')}`]:
      LP_EVENT.CLAIM_REWARD,
  };

  async onModuleInit() {
    if (LP && LP.length) {
      setTimeout(() => {
        for (const result of LP) {
          this.eventEmitter.emit(HttpEventListener.ADD_LISTEN, {
            contractAddress: result,
            eventHandlerCallback: (events: Log[]) => this.handleEvents(events),
          });
        }
      }, 5000);
    }
  }

  private async handleEvents(events: Log[]): Promise<void> {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const { transactionHash: txHash, topics } = event;
      const checkEvent = this.topics[topics[0]];
      if (checkEvent) {
        if (
          checkEvent == LP_EVENT.STAKING ||
          checkEvent == LP_EVENT.UNSTAKING
        ) {
          const returnValues = this.web3.eth.abi.decodeLog(
            [
              {
                indexed: true,
                internalType: 'address',
                name: 'user',
                type: 'address',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
              },
            ],
            event.data,
            [topics[1]],
          );
          const { user, amount } = returnValues;

          const checkUser = await this.userService.createUpdateGetUser(user);
          await this.transactionService.transactionRepository
            .getTransactionModel()
            .findOneAndUpdate(
              { txHash },
              {
                $set: {
                  user: checkUser._id,
                  event: `LP_${checkEvent}`,
                  status: true,
                  typeNetwork,
                  txHash,
                  data: {
                    amount: Decimal128(
                      new BigNumber(amount)
                        .div(new BigNumber(10).pow(18))
                        .toString(),
                    ),
                  },
                },
              },
              {
                upsert: true,
              },
            );
        }
        if (checkEvent == LP_EVENT.CLAIM_REWARD) {
          const returnValues = this.web3.eth.abi.decodeLog(
            [
              {
                indexed: true,
                internalType: 'address',
                name: 'user',
                type: 'address',
              },
              {
                indexed: true,
                internalType: 'address',
                name: 'asset',
                type: 'address',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
              },
            ],
            event.data,
            [topics[1], topics[2]],
          );
          const { user, amount, asset = null } = returnValues;

          const checkUser = await this.userService.createUpdateGetUser(user);
          const incentive = {
            address: '',
            name: '',
            symbol: '',
          };
          let decimal = 18;
          if (asset) {
            incentive.address = asset;
            incentive.name = await this.erc20OrbierCore.name(asset);
            incentive.symbol = await this.erc20OrbierCore.symbol(asset);
            decimal = +(await this.erc20OrbierCore.decimals(asset));
          }
          await this.transactionService.transactionRepository.transactionCreate(
            {
              user: checkUser._id,
              event: `LP_${checkEvent}`,
              status: true,
              typeNetwork,
              txHash,
              data: {
                incentive,
                amount: Decimal128(
                  new BigNumber(amount)
                    .div(new BigNumber(10).pow(decimal))
                    .toString(),
                ),
              },
            },
          );
        }
      }
    }
  }
}
