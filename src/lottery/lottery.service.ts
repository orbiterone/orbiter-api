import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';

import {
  burnPool,
  distributionPrizePercent,
  PRICE_ORB,
} from '@app/core/constant';
import { CurrentLotteryResponse } from './interfaces/lottery.interface';
import { LotteryRepository } from './lottery.repository';
import { BasePagination } from '@app/core/interface/response';
import { LotteryDocument } from '@app/core/schemas/lottery.schema';

@Injectable()
export class LotteryService {
  constructor(public readonly lotteryRepository: LotteryRepository) {}

  private async infoByLottery(
    lottery: LotteryDocument,
  ): Promise<CurrentLotteryResponse> {
    const prizePot = new BigNumber(lottery.amountCollectedInOrb.toString());

    const prizeGroups = [];
    for (const i in distributionPrizePercent) {
      const orb = prizePot.multipliedBy(distributionPrizePercent[i] / 100);
      prizeGroups.push({
        group: i,
        orb: orb.toString(),
        usd: orb.multipliedBy(PRICE_ORB).toString(),
        winningTickets: lottery.countWinnersPerBracket.length
          ? lottery.countWinnersPerBracket[+i - 1]
          : 0,
      });
    }

    const prizeBurnOrb = prizePot.multipliedBy(burnPool / 100);
    const prizeBurn = {
      orb: prizeBurnOrb.toString(),
      usd: prizeBurnOrb.multipliedBy(PRICE_ORB).toString(),
    };

    return {
      startTime: lottery.startTime,
      endTime: lottery.endTime,
      id: lottery.lotteryId,
      ticketPrice: lottery.priceTicket.toString(),
      totalUsers: await this.lotteryRepository
        .getLotteryParticipantModel()
        .countDocuments({ lottery: lottery._id }),
      prizePot: {
        orb: prizePot.toString(),
        usd: prizePot.multipliedBy(PRICE_ORB).toString(),
      },
      prizeGroups,
      prizeBurn,
      finalNumber: lottery.finalNumber,
    };
  }

  async currentLottery(): Promise<CurrentLotteryResponse> {
    const currentLottery = await this.lotteryRepository
      .getLotteryModel()
      .findOne({ status: 1 });

    return await this.infoByLottery(currentLottery);
  }

  async historyLottery(query: BasePagination) {
    const lotteries = await this.lotteryRepository.pagination(
      this.lotteryRepository.getLotteryModel(),
      {
        lotteryId: 1,
        status: 1,
        startTime: 1,
        endTime: 1,
        orbPerBracket: 1,
        countWinnersPerBracket: 1,
        priceTicket: 1,
        amountCollectedInOrb: 1,
        finalNumber: 1,
        countWinningTickets: 1,
      },
      { $match: { status: { $gt: 1 } } },
      query,
    );

    const entities = [];
    if (lotteries && lotteries.entities && lotteries.entities.length) {
      for (const lottery of lotteries.entities) {
        entities.push(await this.infoByLottery(lottery));
      }
    }

    lotteries.entities = entities;

    return lotteries;
  }
}
