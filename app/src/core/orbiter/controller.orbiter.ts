import { Injectable } from '@nestjs/common';
import { Contract } from 'web3-eth-contract';

import { COMPTROLLER } from '../constant';
import { Web3Service } from '../web3/web3.service';
import { comptrollerAbi } from '@app/core/abi/contracts.json';

const { NODE_TYPE } = process.env;

@Injectable()
export class ControllerOrbiterCore {
  constructor(private readonly web3Service: Web3Service) {}

  private contract(): Contract {
    return this.web3Service.getContract(NODE_TYPE, COMPTROLLER, comptrollerAbi);
  }

  async collateralFactorMantissa(oToken: string): Promise<string> {
    const { 1: collateralFactorMantissa } = await this.contract()
      .methods.markets(oToken)
      .call();

    return collateralFactorMantissa;
  }

  async oracle(): Promise<string> {
    return await this.contract().methods.oracle().call();
  }
}
