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
  constructor(private readonly web3Service: Web3Service) {}

  contract(oToken: string, websocket = false): Contract {
    if (!oToken) throw new Error('Need set oToken address');

    switch (websocket) {
      case true:
        return this.web3Service.getContractByWebsocket(
          oToken,
          oToken.toLowerCase() === DEFAULT_TOKEN.toLowerCase()
            ? cEthAbi
            : cErcAbi,
        );
      case false:
        return this.web3Service.getContract(
          oToken,
          oToken.toLowerCase() === DEFAULT_TOKEN.toLowerCase()
            ? cEthAbi
            : cErcAbi,
        );
    }
  }

  async underlying(oToken: string): Promise<string> {
    return await this.contract(oToken).methods.underlying().call();
  }

  async totalSupply(oToken: string): Promise<string> {
    return await this.contract(oToken).methods.totalSupply().call();
  }

  async totalBorrows(oToken: string): Promise<string> {
    return await this.contract(oToken).methods.totalBorrows().call();
  }

  async totalReserves(oToken: string): Promise<string> {
    return await this.contract(oToken).methods.totalReserves().call();
  }

  async decimals(oToken: string): Promise<string> {
    return await this.contract(oToken).methods.decimals().call();
  }

  async reserveFactorMantissa(oToken: string): Promise<string> {
    return await this.contract(oToken).methods.reserveFactorMantissa().call();
  }

  async exchangeRateCurrent(oToken: string): Promise<string> {
    return await this.contract(oToken).methods.exchangeRateCurrent().call();
  }

  async supplyRatePerBlock(oToken: string): Promise<string> {
    return await this.contract(oToken).methods.supplyRatePerBlock().call();
  }

  async borrowRatePerBlock(oToken: string): Promise<string> {
    return await this.contract(oToken).methods.borrowRatePerBlock().call();
  }

  private calculateApy(rate: number): number {
    return (
      (Math.pow((rate / ethMantissa) * blocksPerDay + 1, daysPerYear) - 1) * 100
    );
  }

  async supplyApy(oToken: string): Promise<number> {
    return this.calculateApy(+(await this.supplyRatePerBlock(oToken)));
  }

  async borrowApy(oToken: string): Promise<number> {
    return this.calculateApy(+(await this.borrowRatePerBlock(oToken)));
  }

  async balanceOf(oToken: string, account: string) {
    return await this.contract(oToken).methods.balanceOf(account).call();
  }

  async balanceOfUnderlying(oToken: string, account: string) {
    return await this.contract(oToken)
      .methods.balanceOfUnderlying(account)
      .call();
  }

  async borrowBalanceCurrent(oToken: string, account: string) {
    return await this.contract(oToken)
      .methods.borrowBalanceCurrent(account)
      .call();
  }
}
