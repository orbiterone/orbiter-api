import { Injectable, OnModuleInit } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { Log } from 'web3-core';

import { LOTTERY } from '../constant';
import { LOTTERY_EVENT } from '../event/interfaces/event.interface';
import { Decimal128 } from '../schemas/user.schema';
import { HttpEventAbstractService } from './http-event.abstract.service';
import { HttpEventListener } from './interfaces/http-event.interface';

const { NODE_TYPE_LOTTERY: typeNetwork } = process.env;

@Injectable()
export class LotteryEventHandler
  extends HttpEventAbstractService
  implements OnModuleInit
{
  private topics = {
    [`${this.web3.utils.sha3(
      'LotteryOpen(uint256,uint256,uint256,uint256,uint256,uint256)',
    )}`]: LOTTERY_EVENT.LOTTERY_OPEN,
    [`${this.web3.utils.sha3('LotteryClose(uint256,uint256)')}`]:
      LOTTERY_EVENT.LOTTERY_CLOSE,
    [`${this.web3.utils.sha3('LotteryNumberDrawn(uint256,uint256,uint256)')}`]:
      LOTTERY_EVENT.LOTTERY_DRAWN,
    [`${this.web3.utils.sha3('TicketsPurchase(address,uint256,uint256)')}`]:
      LOTTERY_EVENT.LOTTERY_TICKETS_PURCHASE,
  };

  async onModuleInit() {
    if (LOTTERY) {
      this.eventEmitter.emit(HttpEventListener.ADD_LISTEN, {
        contractAddress: LOTTERY,
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
        if (checkEvent == LOTTERY_EVENT.LOTTERY_OPEN) {
          const returnValues = this.web3.eth.abi.decodeLog(
            [
              {
                indexed: true,
                internalType: 'uint256',
                name: 'lotteryId',
                type: 'uint256',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'startTime',
                type: 'uint256',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'endTime',
                type: 'uint256',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'priceTicketInOrb',
                type: 'uint256',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'firstTicketId',
                type: 'uint256',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'injectedAmount',
                type: 'uint256',
              },
            ],
            event.data,
            [topics[1]],
          );
          await this.lotteryService.lotteryRepository.lotteryCreate({
            lotteryId: +returnValues.lotteryId,
            status: 1,
            startTime: new Date(+returnValues.startTime * 1000),
            endTime: new Date(+returnValues.endTime * 1000),
            priceTicket: Decimal128(
              new BigNumber(returnValues.priceTicketInOrb)
                .div(Math.pow(10, 18))
                .toString(),
            ),
          });
        } else if (checkEvent == LOTTERY_EVENT.LOTTERY_CLOSE) {
          const returnValues = this.web3.eth.abi.decodeLog(
            [
              {
                indexed: true,
                internalType: 'uint256',
                name: 'lotteryId',
                type: 'uint256',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'firstTicketIdNextLottery',
                type: 'uint256',
              },
            ],
            event.data,
            [topics[1]],
          );
          await this.lotteryService.lotteryRepository
            .getLotteryModel()
            .findOneAndUpdate(
              { lotteryId: +returnValues.lotteryId },
              { $set: { status: 2 } },
            );
        } else if (checkEvent == LOTTERY_EVENT.LOTTERY_TICKETS_PURCHASE) {
          const returnValues = this.web3.eth.abi.decodeLog(
            [
              {
                indexed: true,
                internalType: 'address',
                name: 'buyer',
                type: 'address',
              },
              {
                indexed: true,
                internalType: 'uint256',
                name: 'lotteryId',
                type: 'uint256',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'numberTickets',
                type: 'uint256',
              },
            ],
            event.data,
            [topics[1]],
          );
          const lottery = await this.lotteryService.lotteryRepository
            .getLotteryModel()
            .findOne({ lotteryId: +returnValues.lotteryId });
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
          await this.transactionService.transactionRepository.transactionCreate(
            {
              user: checkUser._id,
              event: checkEvent,
              status: true,
              typeNetwork,
              txHash,
              data: {
                lottery: {
                  id: +returnValues.lotteryId,
                  countTickets: returnValues.numberTickets,
                },
              },
            },
          );
          const lotteryBlockChain = await this.lotteryOrbiterCore.viewLottery(
            returnValues.lotteryId,
          );
          await this.lotteryService.lotteryRepository
            .getLotteryModel()
            .findOneAndUpdate(
              { lotteryId: +returnValues.lotteryId },
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
        } else if (checkEvent == LOTTERY_EVENT.LOTTERY_DRAWN) {
          const returnValues = this.web3.eth.abi.decodeLog(
            [
              {
                indexed: true,
                internalType: 'uint256',
                name: 'lotteryId',
                type: 'uint256',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'finalNumber',
                type: 'uint256',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'countWinningTickets',
                type: 'uint256',
              },
            ],
            event.data,
            [topics[1]],
          );
          const lottery = await this.lotteryOrbiterCore.viewLottery(
            returnValues.lotteryId,
          );

          await this.lotteryService.lotteryRepository
            .getLotteryModel()
            .findOneAndUpdate(
              { lotteryId: +returnValues.lotteryId },
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
}
