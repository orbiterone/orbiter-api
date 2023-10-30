import { Injectable } from '@nestjs/common';
import { Contract } from 'web3-eth-contract';

import { Web3Service } from '../web3/web3.service';
import { fpAbi } from '@app/core/abi/contracts.json';

@Injectable()
export class FpOrbiterCore {
  constructor(private readonly web3Service: Web3Service) {}

  contract(fp: string, websocket = false): Contract {
    switch (websocket) {
      case true:
        return this.web3Service.getContractByWebsocket(fp, fpAbi);
      case false:
        return this.web3Service.getContract(fp, fpAbi);
    }
  }

  async stakingAsset(fp: string): Promise<string> {
    return await this.contract(fp).methods.stakingAsset().call();
  }
}
