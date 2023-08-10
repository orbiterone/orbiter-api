import { Injectable } from '@nestjs/common';
import InputDataDecoder from 'ethereum-input-data-decoder';

import { comptrollerAbi } from '@app/core/abi/contracts.json';
import { NODE_TYPE } from '../constant';
import { EventService } from './event.service';
import { CONTROLLER_EVENT, FAIL_EVENT } from './interfaces/event.interface';

@Injectable()
export class ControllerEvent extends EventService {
  private readonly CONTROLLER_METHOD_DIC = {
    '0xede4edd0': CONTROLLER_EVENT.MARKET_EXITED,
    '0xc2998238': CONTROLLER_EVENT.MARKET_ENTERED,
  };

  private decoder = new InputDataDecoder(comptrollerAbi);

  // @Timeout(5000)
  async addListenContract() {
    const contract = this.controllerOrbiterCore.contract(true);
    contract.events
      .allEvents()
      .on('connected', function (subscriptionId) {
        console.log(`Controller successfully connected.`, subscriptionId);
      })
      .on('data', async (event) => {
        const { returnValues, transactionHash: txHash } = event;
        if (
          [
            CONTROLLER_EVENT.MARKET_ENTERED,
            CONTROLLER_EVENT.MARKET_EXITED,
          ].includes(event.event)
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
              (event.event == CONTROLLER_EVENT.MARKET_EXITED &&
                checkEnteredAsset)
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
                typeNetwork: NODE_TYPE,
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
                    const checkUser =
                      await this.userService.createUpdateGetUser(from);
                    await this.transactionService.transactionRepository.transactionCreate(
                      {
                        token: checkToken._id,
                        user: checkUser._id,
                        event: eventType,
                        status: true,
                        typeNetwork: NODE_TYPE,
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
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt);
      });
  }
}
