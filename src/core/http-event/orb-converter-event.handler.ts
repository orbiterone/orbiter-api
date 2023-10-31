import { Injectable, OnModuleInit } from '@nestjs/common';
import { Log } from 'web3-core';
import BigNumber from 'bignumber.js';

import { HttpEventAbstractService } from './http-event.abstract.service';
import { ORB_CONVERTER_EVENT } from '../event/interfaces/event.interface';
import { HttpEventListener } from './interfaces/http-event.interface';
import { ORB_CONVERTER, TOKENS } from '../constant';
import { Decimal128 } from '../schemas/user.schema';

const { NODE_TYPE: typeNetwork } = process.env;

@Injectable()
export class OrbConverterEventHandler
  extends HttpEventAbstractService
  implements OnModuleInit
{
  private topics = {
    [`${this.web3.utils.sha3('Convert(address,uint256)')}`]:
      ORB_CONVERTER_EVENT.CONVERT,
    [`${this.web3.utils.sha3('Redeem(address,uint8,uint256,uint256)')}`]:
      ORB_CONVERTER_EVENT.REDEEM,
    [`${this.web3.utils.sha3('CancelRedeem(address,uint256)')}`]:
      ORB_CONVERTER_EVENT.CANCEL_REDEEM,
    [`${this.web3.utils.sha3('Claim(address,uint256)')}`]:
      ORB_CONVERTER_EVENT.CLAIM,
  };

  async onModuleInit() {
    if (ORB_CONVERTER) {
      setTimeout(() => {
        this.eventEmitter.emit(HttpEventListener.ADD_LISTEN, {
          contractAddress: ORB_CONVERTER,
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
          [
            ORB_CONVERTER_EVENT.CONVERT,
            ORB_CONVERTER_EVENT.CLAIM,
            ORB_CONVERTER_EVENT.CANCEL_REDEEM,
          ].includes(checkEvent)
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
          const decimal = 18;
          const incentive = {
            address: '',
            name: '',
            symbol: '',
          };
          const tokenAddress: string = TOKENS.xORB;

          incentive.address = tokenAddress;
          incentive.name = await this.erc20OrbierCore.name(tokenAddress);
          incentive.symbol = await this.erc20OrbierCore.symbol(tokenAddress);

          await this.transactionService.transactionRepository
            .getTransactionModel()
            .findOneAndUpdate(
              { txHash },
              {
                $set: {
                  user: checkUser._id,
                  event: `ORB_CONVERT_${checkEvent.toUpperCase()}`,
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
              },
              {
                upsert: true,
              },
            );
        }
        if (checkEvent == ORB_CONVERTER_EVENT.REDEEM) {
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
                internalType: 'enum OrbConverter.RedemptionOption',
                name: 'option',
                type: 'uint8',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'redeemAmount',
                type: 'uint256',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'amountToMint',
                type: 'uint256',
              },
            ],
            event.data,
            [topics[1], topics[2]],
          );
          const { user, option, amountToMint } = returnValues;
          const checkUser = await this.userService.createUpdateGetUser(user);

          const decimal = 18;
          const incentive = {
            address: '',
            name: '',
            symbol: '',
          };
          const tokenAddress: string = TOKENS.ORB;
          incentive.address = tokenAddress;
          incentive.name = await this.erc20OrbierCore.name(tokenAddress);
          incentive.symbol = await this.erc20OrbierCore.symbol(tokenAddress);

          await this.transactionService.transactionRepository
            .getTransactionModel()
            .findOneAndUpdate(
              { txHash },
              {
                $set: {
                  user: checkUser._id,
                  event: `ORB_CONVERT_${checkEvent.toUpperCase()}`,
                  status: true,
                  typeNetwork,
                  txHash,
                  data:
                    +option == 0
                      ? {
                          incentive,
                          amount: Decimal128(
                            new BigNumber(amountToMint)
                              .div(new BigNumber(10).pow(decimal))
                              .toString(),
                          ),
                        }
                      : { incentive },
                },
              },
              {
                upsert: true,
              },
            );
        }
      }
    }
  }
}
