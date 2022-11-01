import { Injectable } from '@nestjs/common';
import { Timeout } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';

import { NODE_TYPE } from '../constant';
import { EventService } from './event.service';
import { TOKEN_EVENT } from './interfaces/event.interface';

@Injectable()
export class TokenEvent extends EventService {
  @Timeout(5000)
  async addListenContract() {
    const { tokens } = this.contracts;

    for (const token of Object.values(tokens)) {
      const contract = this.erc20OrbierCore.setToken(token).contract(true);
      contract.events
        .allEvents()
        .on('connected', function (subscriptionId) {
          console.log(
            `Token - ${token} successfully connected.`,
            subscriptionId,
          );
        })
        .on('data', async (event) => {
          const { returnValues, transactionHash: txHash } = event;
          switch (event.event) {
            case TOKEN_EVENT.APPROVAL:
              const { user, spender, value } = returnValues;
              if (value == 0) return;
              const checkUser = await this.userService.createUpdateGetUser(
                user,
              );
              const checkToken = await this.assetService.assetRepository
                .getTokenModel()
                .findOne({ oTokenAddress: { $regex: spender, $options: 'i' } });

              if (checkToken) {
                await this.transactionService.transactionRepository.transactionCreate(
                  {
                    token: checkToken._id,
                    user: checkUser._id,
                    event: event.event,
                    status: true,
                    typeNetwork: NODE_TYPE,
                    txHash,
                    data: {
                      spender,
                      amount: new BigNumber(value)
                        .dividedBy(Math.pow(10, checkToken.tokenDecimal))
                        .toString(),
                    },
                  },
                );
              }

              break;
          }
        })
        .on('error', function (error, receipt) {
          console.log(error, receipt);
        });
    }
  }
}
