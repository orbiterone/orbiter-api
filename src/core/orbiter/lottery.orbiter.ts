import { Injectable } from '@nestjs/common';
import { Contract } from 'web3-eth-contract';

import { LOTTERY } from '../constant';
import { Web3Service } from '../web3/web3.service';
import { lotteryAbi } from '@app/core/abi/contracts.json';

const { NODE_TYPE_LOTTERY: typeNetwork } = process.env;

@Injectable()
export class LotteryOrbiterCore {
  constructor(private readonly web3Service: Web3Service) {}

  contract(websocket = false): Contract {
    switch (websocket) {
      case true:
        return this.web3Service.getContractByWebsocket(
          LOTTERY,
          lotteryAbi,
          typeNetwork,
        );
      case false:
        return this.web3Service.getContract(LOTTERY, lotteryAbi, typeNetwork);
    }
  }

  async currentLotteryId(): Promise<string> {
    return await this.contract().methods.currentLotteryId().call();
  }

  async currentTicketId(): Promise<string> {
    return await this.contract().methods.currentTicketId().call();
  }

  async viewLottery(lotteryId: string) {
    return await this.contract().methods.viewLottery(lotteryId).call();
  }

  async viewNumbersAndStatusesForTicketIds(ticketIds: string[]) {
    return await this.contract()
      .methods.viewNumbersAndStatusesForTicketIds(ticketIds)
      .call();
  }

  async viewRewardsForTicketId(
    lotteryId: string,
    ticketId: string,
    bracket: string,
  ) {
    return await this.contract()
      .methods.viewRewardsForTicketId(lotteryId, ticketId, bracket)
      .call();
  }

  async viewUserInfoForLotteryId(
    user: string,
    lotteryId: string,
    cursor: string,
    size: string,
  ) {
    return await this.contract()
      .methods.viewUserInfoForLotteryId(user, lotteryId, cursor, size)
      .call();
  }
}
