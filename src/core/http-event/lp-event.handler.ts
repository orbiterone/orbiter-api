import { Injectable, OnModuleInit } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { Log } from 'web3-core';

import { FP, LP, SETTINGS, TOKENS } from '../constant';
import { LP_EVENT, TOKEN_EVENT } from '../event/interfaces/event.interface';
import { Decimal128 } from '../schemas/user.schema';
import { HttpEventAbstractService } from './http-event.abstract.service';
import { HttpEventListener } from './interfaces/http-event.interface';

@Injectable()
export class LpEventHandler
  extends HttpEventAbstractService
  implements OnModuleInit
{
  private topics = {
    [`${this.web3.utils.sha3('Staked(address,uint256)')}`]: LP_EVENT.STAKING,
    [`${this.web3.utils.sha3('Unstaked(address,uint256)')}`]:
      LP_EVENT.UNSTAKING,
    [`${this.web3.utils.sha3('ClaimedLpTokens(address,uint256)')}`]:
      LP_EVENT.CLAIM_LP_TOKEN,
    [`${this.web3.utils.sha3('UnstakeRequested(address,uint256)')}`]:
      LP_EVENT.UNSTAKE_REQUEST,
    [`${this.web3.utils.sha3('Claimed(address,address,uint256)')}`]:
      LP_EVENT.CLAIM_REWARD,
    [`${this.web3.utils.sha3('Approval(address,address,uint256)')}`]:
      TOKEN_EVENT.APPROVAL,
  };

  async onModuleInit() {
    if (FP && LP) {
      const fpNetworks = Object.keys(FP);
      setTimeout(() => {
        for (const network of fpNetworks) {
          const fps = FP[network];
          const lps = LP[network];
          if (fps && fps.length > 0) {
            for (const fp of fps) {
              this.eventEmitter.emit(HttpEventListener.ADD_LISTEN, {
                contractAddress: fp,
                typeNetwork: network,
                eventHandlerCallback: (events: Log[]) =>
                  this.handleEvents(events, network),
              });
            }
          }
          if (lps && lps.length > 0) {
            for (const lp of lps) {
              this.eventEmitter.emit(HttpEventListener.ADD_LISTEN, {
                contractAddress: lp,
                typeNetwork: network,
                eventHandlerCallback: (events: Log[]) =>
                  this.handleEvents(events, network),
              });
            }
          }
        }
      }, 5000);
    }
  }

  private async handleEvents(
    events: Log[],
    typeNetwork: string,
  ): Promise<void> {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const {
        transactionHash: txHash,
        topics,
        address: contractAddress,
      } = event;
      const checkEvent = this.topics[topics[0]];
      if (checkEvent) {
        if (
          checkEvent == LP_EVENT.STAKING ||
          checkEvent == LP_EVENT.UNSTAKING ||
          checkEvent == LP_EVENT.UNSTAKE_REQUEST ||
          checkEvent == LP_EVENT.CLAIM_LP_TOKEN
        ) {
          const returnValues = this.web3.eth.abi.decodeLog(
            [
              {
                indexed: true,
                internalType: 'address',
                name: 'user',
                type: 'address',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
              },
            ],
            event.data,
            [topics[1]],
          );
          const { user, amount } = returnValues;

          const checkUser = await this.userService.createUpdateGetUser(user);
          const incentive = {
            address: '',
            name: 'LP_TOKEN',
            symbol: 'LP_TOKEN',
            image:
              typeNetwork == 'moonbeam' || typeNetwork == 'moonbase'
                ? SETTINGS.GLMR_LP
                : SETTINGS.ETH_LP,
          };
          try {
            const stakingAsset = await this.fpOrbiterCore.stakingAsset(
              contractAddress,
            );
            if (
              stakingAsset &&
              stakingAsset.toLowerCase() == TOKENS.xORB.toLowerCase()
            ) {
              incentive.name = 'xORB';
              incentive.symbol = 'xORB';
              incentive.image = SETTINGS.xORB;
            }
          } catch (err) {}

          await this.transactionService.transactionRepository.transactionCreate(
            {
              user: checkUser._id,
              event: `${
                incentive.name == 'xORB' ? 'XORB' : 'LP'
              }_${checkEvent}`,
              status: true,
              typeNetwork,
              txHash,
              data: {
                amount: Decimal128(
                  new BigNumber(amount)
                    .div(new BigNumber(10).pow(18))
                    .toString(),
                ),
                incentive,
              },
            },
          );
        }
        if (checkEvent == LP_EVENT.CLAIM_REWARD) {
          const returnValues = this.web3.eth.abi.decodeLog(
            [
              {
                indexed: true,
                internalType: 'address',
                name: 'user',
                type: 'address',
              },
              {
                indexed: true,
                internalType: 'address',
                name: 'asset',
                type: 'address',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
              },
            ],
            event.data,
            [topics[1], topics[2]],
          );
          const { user, amount, asset = null } = returnValues;

          const checkUser = await this.userService.createUpdateGetUser(user);
          const incentive = {
            address: '',
            name: '',
            symbol: '',
          };
          let decimal = 18;
          if (asset) {
            incentive.address = asset;
            incentive.name = await this.erc20OrbierCore.name(
              asset,
              typeNetwork,
            );
            incentive.symbol = await this.erc20OrbierCore.symbol(
              asset,
              typeNetwork,
            );
            decimal = +(await this.erc20OrbierCore.decimals(
              asset,
              typeNetwork,
            ));
          }
          await this.transactionService.transactionRepository.transactionCreate(
            {
              user: checkUser._id,
              event: `LP_${checkEvent}`,
              status: true,
              typeNetwork,
              txHash,
              data: {
                incentive,
                amount: Decimal128(
                  new BigNumber(amount)
                    .div(new BigNumber(10).pow(decimal))
                    .toString(),
                ),
              },
            },
          );
        }
        if (checkEvent == TOKEN_EVENT.APPROVAL) {
          const returnValues = this.web3.eth.abi.decodeLog(
            [
              {
                indexed: true,
                internalType: 'address',
                name: 'owner',
                type: 'address',
              },
              {
                indexed: true,
                internalType: 'address',
                name: 'spender',
                type: 'address',
              },
              {
                indexed: false,
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
              },
            ],
            event.data,
            [topics[1], topics[2]],
          );
          const { owner, value } = returnValues;
          if (+value == 0) continue;
          const transaction = await this.web3Service
            .getClient(typeNetwork)
            .eth.getTransaction(txHash);
          const methodCode = transaction.input.substring(0, 10);
          if (methodCode != '0x095ea7b3') continue;
          const checkUser = await this.userService.createUpdateGetUser(owner);

          const decimal = +(await this.erc20OrbierCore.decimals(
            contractAddress,
            typeNetwork,
          ));

          await this.transactionService.transactionRepository.transactionCreate(
            {
              user: checkUser._id,
              event: `LP_${checkEvent}`,
              status: true,
              typeNetwork,
              txHash,
              data: {
                user: owner,
                amount: Decimal128(
                  new BigNumber(value)
                    .div(new BigNumber(10).pow(decimal))
                    .toString(),
                ),
                incentive: {
                  address: '',
                  name: 'LP_TOKEN',
                  symbol: 'LP_TOKEN',
                  image:
                    typeNetwork == 'moonbeam' || typeNetwork == 'moonbase'
                      ? SETTINGS.GLMR_LP
                      : SETTINGS.ETH_LP,
                },
              },
            },
          );
        }
      }
    }
  }
}
