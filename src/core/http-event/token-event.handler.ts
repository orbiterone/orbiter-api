import { Injectable, OnModuleInit } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { Log } from 'web3-core';

import { HttpEventService } from './http-event.service';
import { Decimal128 } from '../schemas/user.schema';
import { TOKEN_EVENT } from '../event/interfaces/event.interface';
import { HttpEventAbstractService } from './http-event.abstract.service';

const { NODE_TYPE: typeNetwork } = process.env;

@Injectable()
export class TokenEventHandler
  extends HttpEventAbstractService
  implements OnModuleInit
{
  private topics = {
    [`${this.web3.utils.sha3('Approval(address,address,uint256)')}`]:
      TOKEN_EVENT.APPROVAL,
  };

  async onModuleInit() {
    const { tokens } = this.contracts;

    for (const token of Object.values(tokens)) {
      this.httpEventService.addListenContract({
        contractAddress: token,
        eventHandlerCallback: (events: Log[]) => this.handleEvents(events),
      });
    }
  }

  private async handleEvents(events: Log[]): Promise<void> {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const { transactionHash: txHash, topics } = event;
      const checkEvent = this.topics[topics[0]];
      if (checkEvent) {
        switch (checkEvent) {
          case TOKEN_EVENT.APPROVAL:
            const txDecode = this.web3.eth.abi.decodeLog(
              [
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'owner',
                  type: 'address',
                },
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'spender',
                  type: 'address',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'value',
                  type: 'uint256',
                },
              ],
              event.data,
              [topics[1], topics[2]],
            );
            const { owner, spender, value } = txDecode;
            if (+value == 0) return;
            const checkUser = await this.userService.createUpdateGetUser(owner);
            const transaction = await this.web3Service
              .getClient()
              .eth.getTransaction(txHash);

            const checkToken = await this.assetService.assetRepository
              .getTokenModel()
              .findOne({
                tokenAddress: { $regex: transaction.to, $options: 'i' },
                oTokenAddress: { $regex: spender, $options: 'i' },
              });

            if (checkToken) {
              await this.transactionService.transactionRepository.transactionCreate(
                {
                  token: checkToken._id,
                  user: checkUser._id,
                  event: checkEvent,
                  status: true,
                  typeNetwork,
                  txHash,
                  data: {
                    user: owner,
                    amount: Decimal128(
                      new BigNumber(value)
                        .div(new BigNumber(10).pow(checkToken.tokenDecimal))
                        .toString(),
                    ),
                  },
                },
              );
            }

            break;
        }
      }
    }
  }
}
