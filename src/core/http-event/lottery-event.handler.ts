import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventData } from 'web3-eth-contract';
import BigNumber from 'bignumber.js';

import { HttpEventService } from './http-event.service';
import { HandledEventsType } from '../schemas/handled-block-number.schema';
import { LOTTERY_EVENT } from '../event/interfaces/event.interface';
import { Decimal128 } from '../schemas/user.schema';

const { NODE_TYPE_LOTTERY: typeNetwork } = process.env;

@Injectable()
export class LotteryEventHandler
  extends HttpEventService
  implements OnModuleInit
{
  onModuleInit() {
    const contract = this.lotteryOrbiterCore.contract();
    this.addListenContract({
      contract,
      contractType: HandledEventsType.LOTTERY,
      network: typeNetwork,
      eventHandlerCallback: (events: EventData[]) => this.handleEvents(events),
    });
  }

  private async handleEvents(events: EventData[]): Promise<void> {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const { returnValues, transactionHash: txHash } = event;
      if (event.event == LOTTERY_EVENT.LOTTERY_OPEN) {
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
      } else if (event.event == LOTTERY_EVENT.LOTTERY_CLOSE) {
        await this.lotteryService.lotteryRepository
          .getLotteryModel()
          .findOneAndUpdate(
            { lotteryId: returnValues.lotteryId },
            { $set: { status: 2 } },
          );
      } else if (event.event == LOTTERY_EVENT.LOTTERY_TICKETS_PURCHASE) {
        const lottery = await this.lotteryService.lotteryRepository
          .getLotteryModel()
          .findOne({ lotteryId: returnValues.lotteryId });
        const checkUser = await this.userService.createUpdateGetUser(
          returnValues.buyer,
        );
        await this.lotteryService.lotteryRepository
          .getLotteryParticipantModel()
          .findOneAndUpdate(
            { user: checkUser._id, lottery: lottery._id },
            { $inc: { countTickets: returnValues.numberTickets } },
            { upsert: true },
          );
        await this.transactionService.transactionRepository.transactionCreate({
          user: checkUser._id,
          event: event.event,
          status: true,
          typeNetwork,
          txHash,
          data: {
            lottery: {
              id: returnValues.lotteryId,
              countTickets: returnValues.numberTickets,
            },
          },
        });
        const lotteryBlockChain = await this.lotteryOrbiterCore.viewLottery(
          returnValues.lotteryId,
        );
        await this.lotteryService.lotteryRepository
          .getLotteryModel()
          .findOneAndUpdate(
            { lotteryId: returnValues.lotteryId },
            {
              $set: {
                amountCollectedInOrb: Decimal128(
                  new BigNumber(lotteryBlockChain.amountCollectedInOrb)
                    .div(Math.pow(10, 18))
                    .toString(),
                ),
              },
            },
          );
      } else if (event.event == LOTTERY_EVENT.LOTTERY_DRAWN) {
        const lottery = await this.lotteryOrbiterCore.viewLottery(
          returnValues.lotteryId,
        );

        await this.lotteryService.lotteryRepository
          .getLotteryModel()
          .findOneAndUpdate(
            { lotteryId: returnValues.lotteryId },
            {
              $set: {
                finalNumber: returnValues.finalNumber,
                orbPerBracket: lottery.orbPerBracket,
                countWinnersPerBracket: lottery.countWinnersPerBracket,
                countWinningTickets: returnValues.countWinningTickets,
                amountCollectedInOrb: Decimal128(
                  new BigNumber(lottery.amountCollectedInOrb)
                    .div(Math.pow(10, 18))
                    .toString(),
                ),
                status: 3,
              },
            },
          );
      }
    }
  }
}
