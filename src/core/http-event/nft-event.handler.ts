import { Injectable, OnModuleInit } from '@nestjs/common';
import { Log } from 'web3-core';

import { NFT } from '../constant';
import { HttpEventService } from './http-event.service';
import { NFT_EVENT } from '../event/interfaces/event.interface';

const { NODE_TYPE_LOTTERY: typeNetwork } = process.env;

@Injectable()
export class NftEventHandler extends HttpEventService implements OnModuleInit {
  private topics = {
    [`${this.web3.utils.sha3('Transfer(address,address,uint256)')}`]:
      NFT_EVENT.TRANSFER,
  };

  async onModuleInit() {
    if (NFT) {
      this.addListenContract({
        contractAddress: NFT,
        eventHandlerCallback: (events: Log[]) => this.handleEvents(events),
      });
    }
  }

  private async handleEvents(events: Log[]): Promise<void> {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const { transactionHash: txHash, topics } = event;
      const checkEvent = this.topics[topics[0]];
      if (checkEvent) {
        if (checkEvent == NFT_EVENT.TRANSFER) {
          const returnValues = this.web3.eth.abi.decodeLog(
            [
              {
                indexed: true,
                internalType: 'address',
                name: 'from',
                type: 'address',
              },
              {
                indexed: true,
                internalType: 'address',
                name: 'to',
                type: 'address',
              },
              {
                indexed: true,
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
              },
            ],
            event.data,
            [topics[1], topics[2], topics[3]],
          );
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
}
