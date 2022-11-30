import { Injectable } from '@nestjs/common';
import { Timeout } from '@nestjs/schedule';
import { Decimal } from 'decimal.js';

import { NODE_TYPE } from '../constant';
import { Decimal128 } from '../schemas/user.schema';
import { EventService } from './event.service';
import { TOKEN_EVENT } from './interfaces/event.interface';

Decimal.set({ toExpNeg: -30, toExpPos: 30 });

@Injectable()
export class TokenEvent extends EventService {
  @Timeout(5000)
  async addListenContract() {
    const { tokens } = this.contracts;

    for (const token of Object.values(tokens)) {
      const contract = this.erc20OrbierCore.contract(token, true);
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
              const { owner, spender, value } = returnValues;
              if (value == 0) return;
              const checkUser = await this.userService.createUpdateGetUser(
                owner,
              );
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
                    event: event.event,
                    status: true,
                    typeNetwork: NODE_TYPE,
                    txHash,
                    data: {
                      user: owner,
                      amount: Decimal128(
                        new Decimal(value)
                          .div(Math.pow(10, checkToken.tokenDecimal))
                          .toString(),
                      ),
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
