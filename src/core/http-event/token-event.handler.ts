import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventData } from 'web3-eth-contract';
import BigNumber from 'bignumber.js';

import { HttpEventService } from './http-event.service';
import { HandledEventsType } from '../schemas/handled-block-number.schema';
import { Decimal128 } from '../schemas/user.schema';
import { TOKEN_EVENT } from '../event/interfaces/event.interface';

const { NODE_TYPE: typeNetwork } = process.env;

@Injectable()
export class TokenEventHandler
  extends HttpEventService
  implements OnModuleInit
{
  onModuleInit() {
    const { tokens } = this.contracts;

    for (const token of Object.values(tokens)) {
      const contract = this.erc20OrbierCore.contract(token, true);
      this.addListenContract({
        contract,
        contractType: HandledEventsType.TOKEN,
        network: typeNetwork,
        eventHandlerCallback: (events: EventData[]) =>
          this.handleEvents(events),
      });
    }
  }

  private async handleEvents(events: EventData[]): Promise<void> {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const { returnValues, transactionHash: txHash } = event;
      switch (event.event) {
        case TOKEN_EVENT.APPROVAL:
          const { owner, spender, value } = returnValues;
          if (value == 0) return;
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
                event: event.event,
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
