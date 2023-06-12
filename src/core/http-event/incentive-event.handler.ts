import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventData } from 'web3-eth-contract';
import BigNumber from 'bignumber.js';

import { HttpEventService } from './http-event.service';
import { HandledEventsType } from '../schemas/handled-block-number.schema';
import {
  INCENTIVE_EVENT,
  LOTTERY_EVENT,
} from '../event/interfaces/event.interface';
import { Decimal128 } from '../schemas/user.schema';
import { INCENTIVE } from '../constant';

const { NODE_TYPE_LOTTERY: typeNetwork } = process.env;

@Injectable()
export class IncentiveEventHandler
  extends HttpEventService
  implements OnModuleInit
{
  onModuleInit() {
    this.incentiveOrbiterCore.getAllSupportIncentives().then((result) => {
      for (const token of result) {
        const contract = this.oTokenCore.contract(token);
        this.addListenContract({
          contract,
          contractType: HandledEventsType.INCENTIVE,
          network: typeNetwork,
          eventHandlerCallback: (events: EventData[]) =>
            this.handleEvents(events),
        });
      }
    });
  }

  private async handleEvents(events: EventData[]): Promise<void> {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const { returnValues, transactionHash: txHash, address: token } = event;
      if (event.event == INCENTIVE_EVENT.TRANSFER) {
        const { from, to, value } = returnValues;
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
                    .div(new BigNumber(10).pow(incentiveToken.tokenDecimal))
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
