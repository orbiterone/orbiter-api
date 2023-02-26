import { Injectable } from '@nestjs/common';
import { Contract } from 'web3-eth-contract';

import { Web3Service } from '../web3/web3.service';
import { erc20Abi } from '@app/core/abi/contracts.json';

@Injectable()
export class Erc20OrbiterCore {
  constructor(private readonly web3Service: Web3Service) {}

  contract(erc20Token: string, websocket = false): Contract {
    if (!erc20Token) throw new Error('Need set erc20Token address');

    switch (websocket) {
      case true:
        return this.web3Service.getContractByWebsocket(erc20Token, erc20Abi);
      case false:
        return this.web3Service.getContract(erc20Token, erc20Abi);
    }
  }

  async name(erc20Token: string): Promise<string> {
    return await this.contract(erc20Token).methods.name().call();
  }

  async symbol(erc20Token: string): Promise<string> {
    return await this.contract(erc20Token).methods.symbol().call();
  }

  async decimals(erc20Token: string): Promise<string> {
    return await this.contract(erc20Token).methods.decimals().call();
  }

  async balanceOf(erc20Token: string, address: string): Promise<string> {
    return await this.contract(erc20Token).methods.balanceOf(address).call();
  }
}
