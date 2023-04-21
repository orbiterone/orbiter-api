import { Injectable } from '@nestjs/common';
import { Contract } from 'web3-eth-contract';

import { INCENTIVE } from '../constant';
import { Web3Service } from '../web3/web3.service';
import { incentiveAbi } from '@app/core/abi/contracts.json';

@Injectable()
export class IncentiveOrbiterCore {
  constructor(private readonly web3Service: Web3Service) {}

  contract(websocket = false): Contract {
    switch (websocket) {
      case true:
        return this.web3Service.getContractByWebsocket(INCENTIVE, incentiveAbi);
      case false:
        return this.web3Service.getContract(INCENTIVE, incentiveAbi);
    }
  }

  async getAllSupportIncentives(): Promise<string[]> {
    return await this.contract().methods.getAllSupportIncentives().call();
  }

  async supplyRewardSpeeds(
    incentiveAsset: string,
    oToken: string,
  ): Promise<string> {
    return await this.contract()
      .methods.supplyRewardSpeeds(incentiveAsset, oToken)
      .call();
  }

  async borrowRewardSpeeds(
    incentiveAsset: string,
    oToken: string,
  ): Promise<string> {
    return await this.contract()
      .methods.borrowRewardSpeeds(incentiveAsset, oToken)
      .call();
  }
}
