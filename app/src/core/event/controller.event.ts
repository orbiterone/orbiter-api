import { Injectable } from '@nestjs/common';
import { Timeout } from '@nestjs/schedule';
import { NODE_TYPE } from '../constant';

import { EventService } from './event.service';
import { CONTROLLER_EVENT } from './interfaces/event.interface';

@Injectable()
export class ControllerEvent extends EventService {
  @Timeout(5000)
  async addListenContract() {
    console.log('dsfsdf');
    const contract = this.controllerOrbiterCore.contract(true);
    contract.events
      .allEvents()
      .on('connected', function (subscriptionId) {
        console.log(`Controller successfully connected.`, subscriptionId);
      })
      .on('data', async (event) => {
        const { returnValues } = event;
        console.log(event);
        switch (event.event) {
          case CONTROLLER_EVENT.MARKET_ENTERED:
          case CONTROLLER_EVENT.MARKET_EXITED:
            const { cToken: oToken, account } = returnValues;
            const checkUser = await this.userService.createUpdateGetUser(
              account,
            );
            const checkToken = await this.assetService.assetRepository
              .getTokenModel()
              .findOne({ oTokenAddress: { $regex: oToken, $options: 'i' } });
            if (checkToken) {
              const checkEnteredAsset = (
                await this.controllerOrbiterCore.getAssetsIn(account)
              ).filter((el) => el.toLowerCase() == oToken.toLowerCase());

              let collateral = false;

              if (
                (event.event == CONTROLLER_EVENT.MARKET_ENTERED &&
                  checkEnteredAsset.length) ||
                (event.event == CONTROLLER_EVENT.MARKET_EXITED &&
                  checkEnteredAsset.length)
              ) {
                collateral = true;
              }

              await this.userService.userRepository
                .getUserTokenModel()
                .findOneAndUpdate(
                  {
                    user: checkUser._id,
                    token: checkToken._id,
                  },
                  {
                    $set: {
                      collateral,
                    },
                  },
                  { upsert: true, new: true },
                );

              await this.transactionService.transactionRepository.transactionCreate(
                {
                  token: checkToken._id,
                  user: checkUser._id,
                  event: event.event,
                  status: true,
                  typeNetwork: NODE_TYPE,
                  data: {
                    oToken,
                    account,
                    error:
                      event.event == CONTROLLER_EVENT.MARKET_EXITED &&
                      checkEnteredAsset.length
                        ? true
                        : false,
                  },
                },
              );
            }
            break;
        }
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt);
      });
  }
}
