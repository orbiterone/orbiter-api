import { Injectable } from '@nestjs/common';
import { Timeout } from '@nestjs/schedule';

import { EventService } from './event.service';
import { MARKET_TOKEN_EVENT } from './interfaces/event.interface';

@Injectable()
export class MarketEvent extends EventService {
  @Timeout(5000)
  async addListenContract() {
    const { supportMarkets: markets } = this.contracts;

    for (const token of Object.values(markets)) {
      const contract = this.oTokenCore.setToken(token).contract(true);
      contract.events
        .allEvents()
        .on('connected', function (subscriptionId) {
          console.log(
            `oToken - ${token} successfully connected.`,
            subscriptionId,
          );
        })
        .on('data', (event) => {
          const { returnValues } = event;
          console.log(returnValues);
          switch (event.event) {
            case MARKET_TOKEN_EVENT.Mint:
              break;
            case MARKET_TOKEN_EVENT.Borrow:
              break;
            case MARKET_TOKEN_EVENT.Redeem:
              break;
            case MARKET_TOKEN_EVENT.RepayBorrow:
              break;
            case MARKET_TOKEN_EVENT.LiquidateBorrow:
              break;
          }
        })
        .on('error', function (error, receipt) {
          console.log(error, receipt);
        });
    }
  }
}
