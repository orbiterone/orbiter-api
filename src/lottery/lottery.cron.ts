import { Injectable } from '@nestjs/common';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import moment, { Moment } from 'moment';
import BigNumber from 'bignumber.js';

import { Web3Service } from '@app/core/web3/web3.service';
import {
  LOTTERY,
  CRON_LOTTERY,
  CRON_LOTTERY_TIME,
  LOTTERY_OPERATOR_KEY,
  LOTTERY_TICKET_PRICE_ORB,
  LOTTERY_SETTING,
} from '@app/core/constant';
import { LotteryOrbiterCore } from '@app/core/orbiter/lottery.orbiter';

const cronTimeLottery = CRON_LOTTERY || CronExpression.EVERY_30_MINUTES;

@Injectable()
export class LotteryCron {
  constructor(
    private readonly web3Service: Web3Service,
    private readonly lotteryOrbiterCore: LotteryOrbiterCore,
  ) {}

  @Cron(cronTimeLottery)
  async cronLottery() {
    console.log(`Job cronLottery start - ${new Date()}`);

    const now = moment();
    const owner = this.web3Service
      .getClient()
      .eth.accounts.privateKeyToAccount(LOTTERY_OPERATOR_KEY);
    const lotteryContract = this.lotteryOrbiterCore.contract();

    const currentLotteryId = await this.lotteryOrbiterCore.currentLotteryId();
    const lotteryInfo = await this.lotteryOrbiterCore.viewLottery(
      currentLotteryId,
    );

    if (lotteryInfo && lotteryInfo.status < 3) {
      try {
        if (lotteryInfo.status == 1) {
          await this.wait(60000);
          const hashTx = await this.web3Service.createTx(
            {
              from: owner.address,
              to: LOTTERY,
              data: lotteryContract.methods
                .closeLottery(currentLotteryId)
                .encodeABI(),
            },
            LOTTERY_OPERATOR_KEY,
          );

          console.log(
            `Lottery - ${currentLotteryId} close  ${hashTx}. ${new Date()}`,
          );
          await this.wait(60000 * 3);
        }

        if (lotteryInfo.status == 1 || lotteryInfo.status == 2) {
          const hashTx = await this.web3Service.createTx(
            {
              from: owner.address,
              to: LOTTERY,
              data: lotteryContract.methods
                .drawFinalNumberAndMakeLotteryClaimable(currentLotteryId, true)
                .encodeABI(),
            },
            LOTTERY_OPERATOR_KEY,
          );
          console.log(
            `Lottery - ${currentLotteryId} draw - ${hashTx}. ${new Date()}`,
          );
          await this.wait(60000 * 3);
        }

        await this.createLottery(now, owner, lotteryContract);
      } catch (err) {
        console.error(
          `Cron lottery ${currentLotteryId} close error. ${err.message}`,
        );
      }
    }

    if (lotteryInfo && lotteryInfo.status == 3) {
      await this.createLottery(now, owner, lotteryContract);
    }
  }

  private async createLottery(now: Moment, owner, lotteryContract) {
    try {
      const period: any = CRON_LOTTERY_TIME.split(' ');

      const hashTx = await this.web3Service.createTx(
        {
          from: owner.address,
          to: LOTTERY,
          data: lotteryContract.methods
            .startLottery(
              now
                .add(+period[0], period[1])
                .startOf('hour')
                .unix(),
              new BigNumber(LOTTERY_TICKET_PRICE_ORB)
                .multipliedBy(Math.pow(10, 18))
                .toString(),
              LOTTERY_SETTING.discount,
              LOTTERY_SETTING.rewards,
              LOTTERY_SETTING.treasury,
            )
            .encodeABI(),
        },
        LOTTERY_OPERATOR_KEY,
      );
      console.log(`Lottery - create new - ${hashTx}. ${new Date()}`);
    } catch (err) {
      console.error(`Cron lottery start error. ${err.message}`);
    }
  }

  async wait(ms: number): Promise<any> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
