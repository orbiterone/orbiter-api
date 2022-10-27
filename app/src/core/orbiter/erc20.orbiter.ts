import { Injectable } from '@nestjs/common';
import { Contract } from 'web3-eth-contract';

import { DEFAULT_TOKEN } from '../constant';
import { Web3Service } from '../web3/web3.service';
import { erc20Abi } from '@app/core/abi/contracts.json';

const { NODE_TYPE } = process.env;

@Injectable()
export class Erc20OrbiterCore {
  private erc20Token: string;

  constructor(private readonly web3Service: Web3Service) {}

  setToken(erc20Token: string) {
    this.erc20Token = erc20Token;
  }

  private contract(): Contract {
    if (!this.erc20Token) throw new Error('Need set erc20Token address');

    return this.web3Service.getContract(NODE_TYPE, this.erc20Token, erc20Abi);
  }

  async name(): Promise<string> {
    return await this.contract().methods.name().call();
  }

  async symbol(): Promise<string> {
    return await this.contract().methods.symbol().call();
  }

  async decimals(): Promise<string> {
    return await this.contract().methods.decimals().call();
  }

  async balanceOf(address: string): Promise<string> {
    return await this.contract().methods.balanceOf(address).call();
  }
}
