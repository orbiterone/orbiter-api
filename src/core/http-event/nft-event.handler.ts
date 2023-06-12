import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventData } from 'web3-eth-contract';
import BigNumber from 'bignumber.js';

import { HttpEventService } from './http-event.service';
import { HandledEventsType } from '../schemas/handled-block-number.schema';
import { NFT_EVENT } from '../event/interfaces/event.interface';
import { Decimal128 } from '../schemas/user.schema';
import { INCENTIVE } from '../constant';

const { NODE_TYPE_LOTTERY: typeNetwork } = process.env;

@Injectable()
export class NftEventHandler extends HttpEventService implements OnModuleInit {
  onModuleInit() {
    const contract = this.nftOrbiterCore.contract();
    this.addListenContract({
      contract,
      contractType: HandledEventsType.NFT,
      network: typeNetwork,
      eventHandlerCallback: (events: EventData[]) => this.handleEvents(events),
    });
  }

  private async handleEvents(events: EventData[]): Promise<void> {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const { returnValues, transactionHash: txHash } = event;
      if (event.event == NFT_EVENT.TRANSFER) {
        const { from, to, tokenId } = returnValues;
        if (from.toLowerCase() == this.zeroAddress.toLowerCase()) {
          const checkUser = await this.userService.createUpdateGetUser(to);
          await this.transactionService.transactionRepository.transactionCreate(
            {
              user: checkUser._id,
              event: NFT_EVENT.MINT,
              status: true,
              typeNetwork,
              txHash,
              data: {
                tokenId,
              },
            },
          );
        }
      }
    }
  }
}
