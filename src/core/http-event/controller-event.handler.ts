import { Injectable, OnModuleInit } from '@nestjs/common';
import { Log } from 'web3-core';
import InputDataDecoder from 'ethereum-input-data-decoder';

import { COMPTROLLER } from '../constant';
import { comptrollerAbi } from '@app/core/abi/contracts.json';
import {
  CONTROLLER_EVENT,
  FAIL_EVENT,
} from '../event/interfaces/event.interface';
import { HttpEventAbstractService } from './http-event.abstract.service';
import { HttpEventListener } from './interfaces/http-event.interface';

const { NODE_TYPE: typeNetwork } = process.env;

@Injectable()
export class ControllerEventHandler
  extends HttpEventAbstractService
  implements OnModuleInit
{
  private topics = {
    [`${this.web3.utils.sha3('MarketEntered(address,address)')}`]:
      CONTROLLER_EVENT.MARKET_ENTERED,
    [`${this.web3.utils.sha3('MarketExited(address,address)')}`]:
      CONTROLLER_EVENT.MARKET_EXITED,
    [`${this.web3.utils.sha3('ActionPaused(address,string,bool)')}`]:
      CONTROLLER_EVENT.ACTION_PAUSED,
    [`${this.web3.utils.sha3('Failure(uint,uint,uint)')}`]: FAIL_EVENT.FAILURE,
  };

  async onModuleInit() {
    setTimeout(() => {
      this.eventEmitter.emit(HttpEventListener.ADD_LISTEN, {
        contractAddress: COMPTROLLER,
        typeNetwork,
        eventHandlerCallback: (events: Log[]) =>
          this.handleEvents(events, typeNetwork),
      });
    }, 5000);
  }

  private readonly CONTROLLER_METHOD_DIC = {
    '0xede4edd0': CONTROLLER_EVENT.MARKET_EXITED,
    '0xc2998238': CONTROLLER_EVENT.MARKET_ENTERED,
  };

  private decoder = new InputDataDecoder(comptrollerAbi);

  private async handleEvents(
    events: Log[],
    typeNetwork: string,
  ): Promise<void> {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const { transactionHash: txHash, topics } = event;
      const checkEvent = this.topics[topics[0]];
      if (checkEvent) {
        if (
          [
            CONTROLLER_EVENT.MARKET_ENTERED,
            CONTROLLER_EVENT.MARKET_EXITED,
          ].includes(checkEvent as CONTROLLER_EVENT)
        ) {
          const txDecode = this.web3.eth.abi.decodeLog(
            [
              {
                indexed: false,
                internalType: 'contract CToken',
                name: 'cToken',
                type: 'address',
              },
              {
                indexed: false,
                internalType: 'address',
                name: 'account',
                type: 'address',
              },
            ],
            event.data,
            [],
          );

          const { cToken: oToken, account } = txDecode;
          const checkUser = await this.userService.createUpdateGetUser(account);
          const checkToken = await this.assetService.assetRepository
            .getTokenModel()
            .findOne({ oTokenAddress: { $regex: oToken, $options: 'i' } });
          if (checkToken) {
            const checkEnteredAsset =
              await this.controllerOrbiterCore.checkMembership(account, oToken);

            let collateral = false;

            if (
              (checkEvent == CONTROLLER_EVENT.MARKET_ENTERED &&
                checkEnteredAsset) ||
              (checkEvent == CONTROLLER_EVENT.MARKET_EXITED &&
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
                event: checkEvent,
                status: true,
                typeNetwork,
                txHash,
                data: {
                  oToken,
                  user: account,
                  error:
                    checkEvent == CONTROLLER_EVENT.MARKET_EXITED &&
                    checkEnteredAsset
                      ? true
                      : false,
                },
              },
            );
          }
        } else if (checkEvent == CONTROLLER_EVENT.ACTION_PAUSED) {
          const txDecode = this.web3.eth.abi.decodeLog(
            [
              {
                indexed: false,
                internalType: 'contract CToken',
                name: 'cToken',
                type: 'address',
              },
              {
                indexed: false,
                internalType: 'string',
                name: 'action',
                type: 'string',
              },
              {
                indexed: false,
                internalType: 'bool',
                name: 'pauseState',
                type: 'bool',
              },
            ],
            event.data,
            [],
          );
          const { cToken: oToken, action, pauseState } = txDecode;
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
        } else if (checkEvent == FAIL_EVENT.FAILURE) {
          const txDecode = this.web3.eth.abi.decodeLog(
            [
              {
                indexed: false,
                internalType: 'uint256',
                name: 'error',
                type: 'uint256',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'info',
                type: 'uint256',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'detail',
                type: 'uint256',
              },
            ],
            event.data,
            [],
          );
          const { error } = txDecode;
          if (+error > 0) {
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
}
