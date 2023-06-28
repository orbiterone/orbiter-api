import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventData } from 'web3-eth-contract';
import InputDataDecoder from 'ethereum-input-data-decoder';

import { comptrollerAbi } from '@app/core/abi/contracts.json';
import { HttpEventService } from './http-event.service';
import { HandledEventsType } from '../schemas/handled-block-number.schema';
import {
  CONTROLLER_EVENT,
  FAIL_EVENT,
} from '../event/interfaces/event.interface';

const { NODE_TYPE: typeNetwork } = process.env;

@Injectable()
export class ControllerEventHandler
  extends HttpEventService
  implements OnModuleInit
{
  onModuleInit() {
    const contract = this.controllerOrbiterCore.contract();
    this.addListenContract({
      contract,
      contractType: HandledEventsType.CONTROLLER,
      network: typeNetwork,
      eventHandlerCallback: (events: EventData[]) => this.handleEvents(events),
    });
  }

  private readonly CONTROLLER_METHOD_DIC = {
    '0xede4edd0': CONTROLLER_EVENT.MARKET_EXITED,
    '0xc2998238': CONTROLLER_EVENT.MARKET_ENTERED,
  };

  private decoder = new InputDataDecoder(comptrollerAbi);

  private async handleEvents(events: EventData[]): Promise<void> {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const { returnValues, transactionHash: txHash } = event;
      if (
        [
          CONTROLLER_EVENT.MARKET_ENTERED,
          CONTROLLER_EVENT.MARKET_EXITED,
        ].includes(event.event as CONTROLLER_EVENT)
      ) {
        const { cToken: oToken, account } = returnValues;
        const checkUser = await this.userService.createUpdateGetUser(account);
        const checkToken = await this.assetService.assetRepository
          .getTokenModel()
          .findOne({ oTokenAddress: { $regex: oToken, $options: 'i' } });
        if (checkToken) {
          const checkEnteredAsset =
            await this.controllerOrbiterCore.checkMembership(account, oToken);

          let collateral = false;

          if (
            (event.event == CONTROLLER_EVENT.MARKET_ENTERED &&
              checkEnteredAsset) ||
            (event.event == CONTROLLER_EVENT.MARKET_EXITED && checkEnteredAsset)
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
              { new: true },
            );

          await this.transactionService.transactionRepository.transactionCreate(
            {
              token: checkToken._id,
              user: checkUser._id,
              event: event.event,
              status: true,
              typeNetwork,
              txHash,
              data: {
                oToken,
                user: account,
                error:
                  event.event == CONTROLLER_EVENT.MARKET_EXITED &&
                  checkEnteredAsset
                    ? true
                    : false,
              },
            },
          );
        }
      } else if (event.event == CONTROLLER_EVENT.ACTION_PAUSED) {
        const { cToken: oToken, action, pauseState } = returnValues;
        const checkToken = await this.assetService.assetRepository
          .getTokenModel()
          .findOne({ oTokenAddress: { $regex: oToken, $options: 'i' } });
        if (checkToken) {
          let field = 'supplyPaused';
          if (action == 'Borrow') {
            field = 'borrowPaused';
          }

          await this.assetService.assetRepository
            .getTokenModel()
            .findOneAndUpdate(
              {
                oTokenAddress: { $regex: oToken, $options: 'i' },
              },
              {
                $set: {
                  [`${field}`]: pauseState,
                },
              },
            );
        }
      } else if (event.event == FAIL_EVENT.FAILURE) {
        const { error } = returnValues;
        if (error > 0) {
          const transaction = await this.web3Service
            .getClient()
            .eth.getTransaction(txHash);
          if (transaction && transaction.from && transaction.to) {
            const { from } = transaction;
            if (transaction.input && transaction.input.length > 2) {
              const methodCode = transaction.input.substring(0, 10);
              if (this.CONTROLLER_METHOD_DIC[methodCode]) {
                const eventType = this.CONTROLLER_METHOD_DIC[methodCode];
                const decoder = this.decoder.decodeData(transaction.input);
                let oToken = '';
                if (eventType == CONTROLLER_EVENT.MARKET_ENTERED) {
                  oToken = decoder.inputs[0][0];
                } else if (eventType == CONTROLLER_EVENT.MARKET_EXITED) {
                  oToken = decoder.inputs[0];
                }
                const checkToken = await this.assetService.assetRepository
                  .getTokenModel()
                  .findOne({
                    oTokenAddress: { $regex: oToken, $options: 'i' },
                  });
                if (checkToken) {
                  const checkUser = await this.userService.createUpdateGetUser(
                    from,
                  );
                  await this.transactionService.transactionRepository.transactionCreate(
                    {
                      token: checkToken._id,
                      user: checkUser._id,
                      event: eventType,
                      status: true,
                      typeNetwork,
                      txHash,
                      data: {
                        oToken,
                        user: checkUser.address,
                        error: true,
                      },
                    },
                  );
                }
              }
            }
          }
        }
      }
    }
  }
}
