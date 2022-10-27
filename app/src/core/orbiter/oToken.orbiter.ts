import { Injectable } from '@nestjs/common';
import { Contract } from 'web3-eth-contract';

import {
  blocksPerDay,
  daysPerYear,
  DEFAULT_TOKEN,
  ethMantissa,
} from '../constant';
import { Web3Service } from '../web3/web3.service';
import { cErcAbi, cEthAbi } from '@app/core/abi/contracts.json';

@Injectable()
export class OTokenOrbiterCore {
  private oToken: string;

  constructor(private readonly web3Service: Web3Service) {}

  setToken(oToken: string) {
    this.oToken = oToken;
  }

  private contract(): Contract {
    if (!this.oToken) throw new Error('Need set oToken address');

    return this.web3Service.getContract(
      this.oToken,
      this.oToken.toLowerCase() === DEFAULT_TOKEN.toLowerCase()
        ? cEthAbi
        : cErcAbi,
    );
  }

  async underlying(): Promise<string> {
    return await this.contract().methods.underlying().call();
  }

  async totalSupply(): Promise<string> {
    return await this.contract().methods.totalSupply().call();
  }

  async totalBorrows(): Promise<string> {
    return await this.contract().methods.totalBorrows().call();
  }

  async totalReserves(): Promise<string> {
    return await this.contract().methods.totalReserves().call();
  }

  async decimals(): Promise<string> {
    return await this.contract().methods.decimals().call();
  }

  async reserveFactorMantissa(): Promise<string> {
    return await this.contract().methods.reserveFactorMantissa().call();
  }

  async exchangeRateCurrent(): Promise<string> {
    return await this.contract().methods.exchangeRateCurrent().call();
  }

  async supplyRatePerBlock(): Promise<string> {
    return await this.contract().methods.supplyRatePerBlock().call();
  }

  async borrowRatePerBlock(): Promise<string> {
    return await this.contract().methods.borrowRatePerBlock().call();
  }

  private calculateApy(rate: number): number {
    return (
      (Math.pow((rate / ethMantissa) * blocksPerDay + 1, daysPerYear) - 1) * 100
    );
  }

  async supplyApy(): Promise<number> {
    return this.calculateApy(+(await this.supplyRatePerBlock()));
  }

  async borrowApy(): Promise<number> {
    return this.calculateApy(+(await this.borrowRatePerBlock()));
  }
}
