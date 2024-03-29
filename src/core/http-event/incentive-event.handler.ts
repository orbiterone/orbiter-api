import { Injectable, OnModuleInit } from '@nestjs/common';
import { Log } from 'web3-core';
import BigNumber from 'bignumber.js';

import { INCENTIVE_EVENT } from '../event/interfaces/event.interface';
import { Decimal128 } from '../schemas/user.schema';
import { INCENTIVE } from '../constant';
import { HttpEventAbstractService } from './http-event.abstract.service';
import { HttpEventListener } from './interfaces/http-event.interface';

const { NODE_TYPE: typeNetwork } = process.env;

@Injectable()
export class IncentiveEventHandler
  extends HttpEventAbstractService
  implements OnModuleInit
{
  private topics = {
    [`${this.web3.utils.sha3('Transfer(address,address,uint256)')}`]:
      INCENTIVE_EVENT.TRANSFER,
  };

  async onModuleInit() {
    if (INCENTIVE) {
      setTimeout(() => {
        this.incentiveOrbiterCore.getAllSupportIncentives().then((result) => {
          if (result && result.length) {
            for (const token of result) {
              this.eventEmitter.emit(HttpEventListener.ADD_LISTEN, {
                contractAddress: token,
                typeNetwork,
                eventHandlerCallback: (events: Log[]) =>
                  this.handleEvents(events, typeNetwork),
              });
            }
          }
        });
      }, 5000);
    }
  }

  private async handleEvents(
    events: Log[],
    typeNetwork: string,
  ): Promise<void> {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const { transactionHash: txHash, topics, address: token } = event;
      const checkEvent = this.topics[topics[0]];
      if (checkEvent) {
        if (checkEvent == INCENTIVE_EVENT.TRANSFER) {
          const txDecode = this.web3.eth.abi.decodeLog(
            [
              {
                type: 'address',
                name: 'from',
                indexed: true,
              },
              {
                type: 'address',
                name: 'to',
                indexed: true,
              },
              {
                type: 'uint256',
                name: 'value',
                indexed: false,
              },
            ],
            event.data,
            [topics[1], topics[2]],
          );
          const { from, to, value } = txDecode;
          if (from.toLowerCase() == INCENTIVE.toLowerCase()) {
            const checkUser = await this.userService.createUpdateGetUser(to);
            const result = await this.readerOrbiterCore.incentives(to);
            const incentiveToken = result.find(
              (el) => el.token.toLowerCase() == token.toLowerCase(),
            );
            const incentive = {
              address: incentiveToken.token,
              name: incentiveToken.tokenName,
              symbol: incentiveToken.tokenSymbol,
            };

            await this.transactionService.transactionRepository.transactionCreate(
              {
                user: checkUser._id,
                event: INCENTIVE_EVENT.CLAIM_REWARD,
                status: true,
                typeNetwork,
                txHash,
                data: {
                  incentive,
                  user: to,
                  amount: Decimal128(
                    new BigNumber(value)
                      .div(new BigNumber(10).pow(+incentiveToken.tokenDecimal))
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
}
