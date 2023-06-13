import { Injectable } from '@nestjs/common';
import { Timeout } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';

import { Decimal128 } from '../schemas/user.schema';
import { EventService } from './event.service';
import { LOTTERY_EVENT } from './interfaces/event.interface';

@Injectable()
export class LotteryEvent extends EventService {
  // @Timeout(5000)
  async addListenContract() {
    const contract = this.lotteryOrbiterCore.contract(true);
    contract.events
      .allEvents()
      .on('connected', function (subscriptionId) {
        console.log(`Lottery successfully connected.`, subscriptionId);
      })
      .on('data', async (event) => {
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
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt);
      });
  }
}
