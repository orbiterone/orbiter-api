import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventData } from 'web3-eth-contract';

import { STAKING } from '../constant';
import { HttpEventService } from './http-event.service';
import { HandledEventsType } from '../schemas/handled-block-number.schema';
import { STAKING_NFT_EVENT } from '../event/interfaces/event.interface';
import { Decimal128 } from '../schemas/user.schema';
import BigNumber from 'bignumber.js';

const { NODE_TYPE_LOTTERY: typeNetwork } = process.env;

@Injectable()
export class StakeNftEventHandler
  extends HttpEventService
  implements OnModuleInit
{
  onModuleInit() {
    if (STAKING) {
      const contract = this.stakingNftOrbiterCore.contract();
      this.addListenContract({
        contract,
        contractType: HandledEventsType.STAKING_NFT,
        network: typeNetwork,
        eventHandlerCallback: (events: EventData[]) =>
          this.handleEvents(events),
      });
    }
  }

  private async handleEvents(events: EventData[]): Promise<void> {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const { returnValues, transactionHash: txHash } = event;
      if (
        event.event == STAKING_NFT_EVENT.STAKING ||
        event.event == STAKING_NFT_EVENT.UNSTAKING
      ) {
        const { user, tokenId } = returnValues;

        const checkUser = await this.userService.createUpdateGetUser(user);
        await this.transactionService.transactionRepository.transactionCreate({
          user: checkUser._id,
          event: event.event,
          status: true,
          typeNetwork,
          txHash,
          data: {
            tokenId,
          },
        });
      }
      if (event.event == STAKING_NFT_EVENT.CLAIM_REWARD) {
        const { user, amount, tokenAddress = null } = returnValues;

        const checkUser = await this.userService.createUpdateGetUser(user);
        const incentive = {
          address: '',
          name: '',
          symbol: '',
        };
        if (tokenAddress) {
          incentive.address = tokenAddress;
          incentive.name = await this.erc20OrbierCore.name(tokenAddress);
          incentive.symbol = await this.erc20OrbierCore.symbol(tokenAddress);
        }
        await this.transactionService.transactionRepository.transactionCreate({
          user: checkUser._id,
          event: event.event,
          status: true,
          typeNetwork,
          txHash,
          data: {
            incentive,
            amount: Decimal128(
              new BigNumber(amount).div(new BigNumber(10).pow(18)).toString(),
            ),
          },
        });
      }
    }
  }
}
