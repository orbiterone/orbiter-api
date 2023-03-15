import { Injectable } from '@nestjs/common';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import moment from 'moment';
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

    if (lotteryInfo && lotteryInfo.status == 1) {
      try {
        const dateNow = new Date().getTime();
        const endTime = +lotteryInfo.endTime * 1000;
        const diffTime = dateNow < endTime ? endTime - dateNow : 1;

        setTimeout(async () => {
          await this.web3Service.createTx(
            {
              from: owner.address,
              to: LOTTERY,
              data: lotteryContract.methods
                .closeLottery(currentLotteryId)
                .encodeABI(),
            },
            LOTTERY_OPERATOR_KEY,
          );

          console.log(`Lottery - ${currentLotteryId} close`);

          await this.web3Service.createTx(
            {
              from: owner.address,
              to: LOTTERY,
              data: lotteryContract.methods
                .drawFinalNumberAndMakeLotteryClaimable(currentLotteryId, true)
                .encodeABI(),
            },
            LOTTERY_OPERATOR_KEY,
          );
          console.log(`Lottery - ${currentLotteryId} draw`);
        }, diffTime);
      } catch (err) {
        console.error(
          `Cron lottery ${currentLotteryId} close error. ${err.message}`,
        );
      }
    }

    try {
      const period: any = CRON_LOTTERY_TIME.split(' ');

      await this.web3Service.createTx(
        {
          from: owner.address,
          to: LOTTERY,
          data: lotteryContract.methods
            .startLottery(
              now.add(+period[0], period[1]).unix(),
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
      console.log(`Lottery - create new`);
    } catch (err) {
      console.error(`Cron lottery start error. ${err.message}`);
    }
  }
}
