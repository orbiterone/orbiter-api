import { Injectable } from '@nestjs/common';
import { Timeout } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';
import { Decimal128 } from '../schemas/user.schema';

import { EventService } from './event.service';
import { LOTTERY_EVENT } from './interfaces/event.interface';

@Injectable()
export class LotteryEvent extends EventService {
  @Timeout(5000)
  async addListenContract() {
    const contract = this.lotteryOrbiterCore.contract(true);
    contract.events
      .allEvents()
      .on('connected', function (subscriptionId) {
        console.log(`Controller successfully connected.`, subscriptionId);
      })
      .on('data', async (event) => {
        const { returnValues, transactionHash: txHash } = event;
        switch (event.event) {
          case LOTTERY_EVENT.LOTTERY_OPEN:
            await this.lotteryService.lotteryRepository.lotteryCreate({
              lotteryId: returnValues.lotteryId,
              status: 1,
              startTime: new Date(returnValues.startTime * 1000),
              endTime: new Date(returnValues.endTime * 1000),
              priceTicket: Decimal128(
                new BigNumber(returnValues.priceTicketInOrb)
                  .div(Math.pow(10, 18))
                  .toString(),
              ),
            });
            break;
          case LOTTERY_EVENT.LOTTERY_CLOSE:
            break;
          case LOTTERY_EVENT.LOTTERY_TICKETS_PURCHASE:
            break;
          case LOTTERY_EVENT.LOTTERY_DRAWN:
            break;
        }
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt);
      });
  }
}
