import { Injectable, OnModuleInit } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { Log } from 'web3-core';

import { STAKING } from '../constant';
import { STAKING_NFT_EVENT } from '../event/interfaces/event.interface';
import { Decimal128 } from '../schemas/user.schema';
import { HttpEventAbstractService } from './http-event.abstract.service';
import { HttpEventListener } from './interfaces/http-event.interface';

const { NODE_TYPE_LOTTERY: typeNetwork } = process.env;

@Injectable()
export class StakeNftEventHandler
  extends HttpEventAbstractService
  implements OnModuleInit
{
  private topics = {
    [`${this.web3.utils.sha3('NftStaked(address,uint256)')}`]:
      STAKING_NFT_EVENT.STAKING,
    [`${this.web3.utils.sha3('NftUnstaked(address,uint256)')}`]:
      STAKING_NFT_EVENT.UNSTAKING,
    [`${this.web3.utils.sha3('ClaimedRewards(address,address,uint256)')}`]:
      STAKING_NFT_EVENT.CLAIM_REWARD,
  };

  async onModuleInit() {
    if (STAKING) {
      setTimeout(() => {
        this.eventEmitter.emit(HttpEventListener.ADD_LISTEN, {
          contractAddress: STAKING,
          typeNetwork,
          eventHandlerCallback: (events: Log[]) => this.handleEvents(events),
        });
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
          checkEvent == STAKING_NFT_EVENT.STAKING ||
          checkEvent == STAKING_NFT_EVENT.UNSTAKING
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
                indexed: true,
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
              },
            ],
            event.data,
            [topics[1], topics[2]],
          );
          const { user, tokenId } = returnValues;

          const checkUser = await this.userService.createUpdateGetUser(user);
          await this.transactionService.transactionRepository
            .getTransactionModel()
            .findOneAndUpdate(
              { txHash },
              {
                $set: {
                  user: checkUser._id,
                  event: checkEvent,
                  status: true,
                  typeNetwork,
                  txHash,
                  data: {
                    tokenId,
                  },
                },
              },
              {
                upsert: true,
              },
            );
        }
        if (checkEvent == STAKING_NFT_EVENT.CLAIM_REWARD) {
          const returnValues = this.web3.eth.abi.decodeLog(
            [
              {
                indexed: true,
                internalType: 'address',
                name: 'tokenAddress',
                type: 'address',
              },
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
            [topics[1], topics[2]],
          );
          const { user, amount, tokenAddress = null } = returnValues;

          const checkUser = await this.userService.createUpdateGetUser(user);
          const incentive = {
            address: '',
            name: '',
            symbol: '',
          };
          let decimal = 18;
          if (tokenAddress) {
            incentive.address = tokenAddress;
            incentive.name = await this.erc20OrbierCore.name(tokenAddress);
            incentive.symbol = await this.erc20OrbierCore.symbol(tokenAddress);
            decimal = +(await this.erc20OrbierCore.decimals(tokenAddress));
          }
          await this.transactionService.transactionRepository.transactionCreate(
            {
              user: checkUser._id,
              event: checkEvent,
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
