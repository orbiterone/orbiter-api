import { Injectable } from '@nestjs/common';
import { Contract } from 'web3-eth-contract';

import { Web3Service } from '../web3/web3.service';
import { priceFeedAbi } from '@app/core/abi/contracts.json';

@Injectable()
export class OracleOrbiterCore {
  private oracle: string;

  constructor(private readonly web3Service: Web3Service) {}

  setToken(oracle: string) {
    this.oracle = oracle;
  }

  private contract(): Contract {
    if (!this.oracle) throw new Error('Need set oracle address');

    return this.web3Service.getContract(this.oracle, priceFeedAbi);
  }

  async getUnderlyingPrice(oToken: string): Promise<string> {
    return await this.contract().methods.getUnderlyingPrice(oToken).call();
  }
}
