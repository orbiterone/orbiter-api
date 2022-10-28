import { Injectable } from '@nestjs/common';
import { Timeout } from '@nestjs/schedule';

import { EventService } from './event.service';
import { CONTROLLER_EVENT } from './interfaces/event.interface';

@Injectable()
export class ControllerEvent extends EventService {
  @Timeout(5000)
  async addListenContract() {
    const contract = this.controllerOrbiterCore.contract(true);
    contract.events
      .allEvents()
      .on('connected', function (subscriptionId) {
        console.log(`Controller successfully connected.`, subscriptionId);
      })
      .on('data', (event) => {
        const { returnValues } = event;
        console.log(returnValues);
        switch (event.event) {
          case CONTROLLER_EVENT.MarketEntered:
            break;
          case CONTROLLER_EVENT.MarketListed:
            break;
          case CONTROLLER_EVENT.MarketExited:
            break;
        }
      })
      .on('error', function (error, receipt) {
        console.log(error, receipt);
      });
  }
}
