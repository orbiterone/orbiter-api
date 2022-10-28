import { Injectable } from '@nestjs/common';
import { Timeout } from '@nestjs/schedule';

import { EventService } from './event.service';
import { TOKEN_EVENT } from './interfaces/event.interface';

@Injectable()
export class TokenEvent extends EventService {
  @Timeout(5000)
  async addListenContract() {
    const { tokens } = this.contracts;

    for (const token of Object.values(tokens)) {
      const contract = this.erc20OrbierCore.setToken(token).contract(true);
      contract.events
        .allEvents()
        .on('connected', function (subscriptionId) {
          console.log(
            `Token - ${token} successfully connected.`,
            subscriptionId,
          );
        })
        .on('data', (event) => {
          const { returnValues } = event;
          switch (event.event) {
            case TOKEN_EVENT.Approval:
              console.log(returnValues);
              //   let projectId = returnValues['projectId'];
              //   let roundId = returnValues['roundId'];
              //   let user = returnValues['user'];
              //   if (event.event == IDO_EVENTS.CLAIM) {
              //     projectId = returnValues['claim'][4];
              //     roundId = returnValues['claim'][2];
              //     user = returnValues['claim'][0];
              //   }
              //   this.eventEmitter.emit(
              //     API_EVENTS.SET_ROUND_DATA,
              //     projectId,
              //     roundId,
              //   );
              //   this.eventEmitter.emit(
              //     API_EVENTS.SET_OWN_DATA,
              //     projectId,
              //     roundId,
              //     user,
              //   );
              break;
          }
        })
        .on('error', function (error, receipt) {
          console.log(error, receipt);
        });
    }
  }
}
