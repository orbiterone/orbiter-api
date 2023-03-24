import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';

import {
  burnPool,
  distributionPrizePercent,
  PRICE_ORB,
} from '@app/core/constant';
import {
  CurrentLotteryResponse,
  TicketsUserByLotteryResponse,
  UserLotteryResponse,
} from './interfaces/lottery.interface';
import { LotteryRepository } from './lottery.repository';
import { BasePagination, PaginatedDto } from '@app/core/interface/response';
import { Lottery, LotteryDocument } from '@app/core/schemas/lottery.schema';
import { User } from '@app/core/schemas/user.schema';
import { LotteryOrbiterCore } from '@app/core/orbiter/lottery.orbiter';

@Injectable()
export class LotteryService {
  constructor(
    public readonly lotteryRepository: LotteryRepository,
    private readonly lotteryOrbiterCore: LotteryOrbiterCore,
  ) {}

  private async infoByLottery(
    lottery: LotteryDocument,
  ): Promise<CurrentLotteryResponse> {
    const prizePot = new BigNumber(lottery.amountCollectedInOrb.toString());

    const prizeGroups = [];
    for (const i in distributionPrizePercent) {
      const orb = prizePot.multipliedBy(distributionPrizePercent[i] / 100);
      const winningTickets = lottery.countWinnersPerBracket.length
        ? lottery.countWinnersPerBracket[+i - 1]
        : 0;
      prizeGroups.push({
        group: i,
        orb: orb.toString(),
        usd: orb.multipliedBy(PRICE_ORB).toString(),
        winningTickets,
        orbByWinningTicket:
          winningTickets > 0 ? orb.dividedBy(winningTickets).toString() : 0,
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
      status: lottery.status,
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
    const currentLotteryId = await this.lotteryOrbiterCore.currentLotteryId();

    const currentLottery = await this.lotteryRepository
      .getLotteryModel()
      .findOne({ lotteryId: +currentLotteryId });

    if (!currentLottery) {
      return null;
    }

    return await this.infoByLottery(currentLottery);
  }

  async historyLottery(
    query: BasePagination,
  ): Promise<PaginatedDto<CurrentLotteryResponse>> {
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
      [{ $match: { status: { $eq: 3 } } }],
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

  async historyLotteryByAccount(
    user: User | null,
    query: BasePagination,
  ): Promise<PaginatedDto<UserLotteryResponse>> {
    const lotteries = await this.lotteryRepository.pagination(
      this.lotteryRepository.getLotteryParticipantModel(),
      {
        id: '$lottery.lotteryId',
        status: '$lottery.status',
        startTime: '$lottery.startTime',
        endTime: '$lottery.endTime',
        countTickets: 1,
        finalNumber: '$lottery.finalNumber',
        createdAt: 1,
      },
      [
        {
          $lookup: {
            from: 'lotteries',
            localField: 'lottery',
            foreignField: '_id',
            as: 'lottery',
          },
        },
        {
          $unwind: {
            path: '$lottery',
          },
        },
        {
          $match: {
            'lottery.status': 3,
            user: user ? user._id : null,
          },
        },
      ],
      query,
    );

    return lotteries;
  }

  async ticketsUserByLottery(
    user: User | null,
    lottery: Lottery,
  ): Promise<TicketsUserByLotteryResponse> {
    const userTickets = await this.lotteryRepository
      .getLotteryParticipantModel()
      .findOne({ user: user ? user._id : null, lottery: lottery._id });

    if (!userTickets) {
      return null;
    }

    const response = {
      winingNumber: lottery.finalNumber,
      totalTickets: 0,
      winningTickets: 0,
      tickets: [],
    };

    const {
      0: ticketIds,
      1: ticketNumbers,
      2: ticketStatuses,
    } = await this.lotteryOrbiterCore.viewUserInfoForLotteryId(
      user.address,
      lottery.lotteryId.toString(),
      '0',
      userTickets.countTickets.toString(),
    );

    if (ticketIds && ticketIds.length) {
      response.totalTickets = ticketIds.length;

      let i = 0;
      for (const ticketId of ticketIds) {
        response.tickets[i] = {
          ticketId: ticketId,
          ticketNumber: ticketNumbers[i],
          claimStatus: ticketStatuses[i],
          winning: false,
          matches: [],
        };
        for (let bracket = 0; bracket <= 5; bracket++) {
          const checkReward =
            await this.lotteryOrbiterCore.viewRewardsForTicketId(
              lottery.lotteryId.toString(),
              ticketId.toString(),
              bracket.toString(),
            );
          response.tickets[i].matches[bracket] =
            +checkReward > 0 ? true : false;

          if (+checkReward > 0) {
            response.tickets[i].winning = true;
          }
        }
        if (response.tickets[i].winning) {
          response.winningTickets++;
        }
        i++;
      }
    }

    return response;
  }
}
