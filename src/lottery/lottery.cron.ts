import { Injectable } from '@nestjs/common';
import { Cron, CronExpression, Timeout } from '@nestjs/schedule';
import moment, { Moment } from 'moment';
import BigNumber from 'bignumber.js';

import { Web3Service } from '@app/core/web3/web3.service';
import {
  CRON_LOTTERY,
  CRON_LOTTERY_TIME,
  LOTTERY_OPERATOR_KEY,
  LOTTERY_TICKET_PRICE_ORB,
  LOTTERY_SETTING,
} from '@app/core/constant';
import { HttpRequestsService } from '@app/core/http-requests/http-requests.service';
import { LotteryOrbiterCore } from '@app/core/orbiter/lottery.orbiter';
import { DiscordService } from '@app/core/discord/discord.service';

const cronTimeLottery = CRON_LOTTERY || 86400000;

const {
  NODE_TYPE_LOTTERY: typeNetwork,
  DISCORD_WEBHOOK_LOTTERY,
  DIA_BALANCE_ADDRESS,
  DISCORD_WEBHOOK_DIA_BALANCE,
} = process.env;

@Injectable()
export class LotteryCron {
  constructor(
    private readonly web3Service: Web3Service,
    private readonly discordService: DiscordService,
    private readonly lotteryOrbiterCore: LotteryOrbiterCore,
    private readonly httpRequestService: HttpRequestsService,
  ) {}

  private reinitCount = 0;

  @Timeout(5000)
  async lotteryInit() {
    try {
      const currentLotteryId = await this.lotteryOrbiterCore.currentLotteryId();
      const lotteryInfo = await this.lotteryOrbiterCore.viewLottery(
        currentLotteryId,
      );
      const nowDate = parseInt((new Date().getTime() / 1000).toString());
      const endLotteryTime = lotteryInfo.endTime;
      if (nowDate >= endLotteryTime) {
        setInterval(() => {
          this.cronLottery();
        }, +cronTimeLottery);
        await this.cronLottery();
      } else if (endLotteryTime > nowDate) {
        const diffTime = (endLotteryTime - nowDate) * 1000;
        await this.wait(diffTime);
        setInterval(() => {
          this.cronLottery();
        }, +cronTimeLottery);
        await this.cronLottery();
      }
    } catch (err) {
      console.error(`Lottery init error: ${err.message}`);
      await this.discordService.sendNotification(
        DISCORD_WEBHOOK_LOTTERY,
        `:warning: Lottery init error: ${err.message}`,
      );
    }
  }

  async cronLottery() {
    console.log(`Job cronLottery start - ${new Date()}`);
    const web3 = this.web3Service.getClient(typeNetwork);

    const now = moment();
    web3.eth.accounts.wallet.add('0x' + LOTTERY_OPERATOR_KEY);

    const myWalletAddress = web3.eth.accounts.wallet[0].address;

    const fromMyWallet: any = {
      from: myWalletAddress,
      gasLimit: web3.utils.toHex(210000),
      gasPrice: web3.utils.toHex(750000000000),
    };

    const gasPrice = await web3.eth.getGasPrice();

    fromMyWallet.gasPrice = web3.utils.toHex(gasPrice);

    try {
      const lotteryContract = this.lotteryOrbiterCore.contract();

      const currentLotteryId = await this.lotteryOrbiterCore.currentLotteryId();
      const lotteryInfo = await this.lotteryOrbiterCore.viewLottery(
        currentLotteryId,
      );

      if (lotteryInfo && lotteryInfo.status < 3) {
        try {
          if (lotteryInfo.status == 1) {
            await this.wait(60000);
            const estimateGas = await lotteryContract.methods
              .closeLottery(currentLotteryId)
              .estimateGas({ from: fromMyWallet.from });
            fromMyWallet.gasLimit = web3.utils.toHex(estimateGas);

            await lotteryContract.methods
              .closeLottery(currentLotteryId)
              .send(fromMyWallet);

            console.log(`Lottery - ${currentLotteryId} close. ${new Date()}`);
            await this.discordService.sendNotification(
              DISCORD_WEBHOOK_LOTTERY,
              `:white_check_mark: Lottery - ${currentLotteryId} close. ${new Date()}`,
            );
            await this.wait(60000 * 2);
          }
        } catch (err) {
          console.error(
            `Cron lottery ${currentLotteryId} close error. ${err.message}`,
          );
          await this.discordService.sendNotification(
            DISCORD_WEBHOOK_LOTTERY,
            `:warning: Cron lottery ${currentLotteryId} close error. ${err.message}`,
          );
          throw err;
        }

        try {
          if (lotteryInfo.status == 1 || lotteryInfo.status == 2) {
            const estimateGas = await lotteryContract.methods
              .drawFinalNumberAndMakeLotteryClaimable(currentLotteryId, true)
              .estimateGas({ from: fromMyWallet.from });
            fromMyWallet.gasLimit = web3.utils.toHex(estimateGas);

            await lotteryContract.methods
              .drawFinalNumberAndMakeLotteryClaimable(currentLotteryId, true)
              .send(fromMyWallet);

            console.log(`Lottery - ${currentLotteryId} draw. ${new Date()}`);
            await this.discordService.sendNotification(
              DISCORD_WEBHOOK_LOTTERY,
              `:white_check_mark: Lottery - ${currentLotteryId} draw. ${new Date()}`,
            );
            await this.wait(60000 * 2);
          }
        } catch (err) {
          console.error(
            `Cron lottery ${currentLotteryId} draw error. ${err.message}`,
          );
          await this.discordService.sendNotification(
            DISCORD_WEBHOOK_LOTTERY,
            `:warning: Cron lottery ${currentLotteryId} draw error. ${err.message}`,
          );
          throw err;
        }

        // await this.createLottery(now, fromMyWallet, lotteryContract);
      }

      // if (lotteryInfo && lotteryInfo.status == 3) {
      // await this.createLottery(now, fromMyWallet, lotteryContract);
      // }
    } catch (err) {
      if (this.reinitCount == 5) {
        this.reinitCount = 0;
        return;
      }
      console.error(
        `Cron lottery error: ${err.message}. Reinit cron lottery after 60 sec`,
      );
      await this.discordService.sendNotification(
        DISCORD_WEBHOOK_LOTTERY,
        `:warning: Cron lottery error: ${err.message}. Reinit cron lottery after 60 sec`,
      );
      await this.wait(60000);
      this.reinitCount++;
      await this.cronLottery();
    }
  }

  private async createLottery(now: Moment, fromMyWallet, lotteryContract) {
    try {
      const period: any = CRON_LOTTERY_TIME.split(' ');
      const endLottery = now
        .add(+period[0], period[1])
        .startOf('minute')
        .unix();
      const estimateGas = await lotteryContract.methods
        .startLottery(
          endLottery,
          new BigNumber(LOTTERY_TICKET_PRICE_ORB)
            .multipliedBy(Math.pow(10, 18))
            .toString(),
          LOTTERY_SETTING.discount,
          LOTTERY_SETTING.rewards,
          LOTTERY_SETTING.treasury,
        )
        .estimateGas({ from: fromMyWallet.from });

      fromMyWallet.gasLimit = this.web3Service
        .getClient(typeNetwork)
        .utils.toHex(estimateGas);

      await lotteryContract.methods
        .startLottery(
          endLottery,
          new BigNumber(LOTTERY_TICKET_PRICE_ORB)
            .multipliedBy(Math.pow(10, 18))
            .toString(),
          LOTTERY_SETTING.discount,
          LOTTERY_SETTING.rewards,
          LOTTERY_SETTING.treasury,
        )
        .send(fromMyWallet);

      console.log(`Lottery - create new. ${new Date()}`);
      await this.discordService.sendNotification(
        DISCORD_WEBHOOK_LOTTERY,
        `:white_check_mark: Lottery - create new. ${new Date()}`,
      );
    } catch (err) {
      console.error(`Cron lottery start error. ${err.message}`);
      await this.discordService.sendNotification(
        DISCORD_WEBHOOK_LOTTERY,
        `:warning: Cron lottery start error. ${err.message}`,
      );
      throw err;
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkDiaOracleBalance() {
    const diaBalances = DIA_BALANCE_ADDRESS
      ? DIA_BALANCE_ADDRESS.split(',')
      : [];
    if (diaBalances && diaBalances.length) {
      for (const address of diaBalances) {
        const balance = await this.web3Service
          .getClient()
          .eth.getBalance(address);

        const balanceConvert = this.web3Service
          .getClient()
          .utils.fromWei(balance, 'ether');

        await this.discordService.sendNotification(
          DISCORD_WEBHOOK_DIA_BALANCE,
          `:white_check_mark: ${address} - ${balanceConvert} GLMR. ${new Date()}`,
        );
        if (+balanceConvert < 1) {
          await this.discordService.sendNotification(
            DISCORD_WEBHOOK_DIA_BALANCE,
            `:warning: ${address} needs to be replenish.`,
          );
        }
      }
    }
  }

  async wait(ms: number): Promise<any> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
