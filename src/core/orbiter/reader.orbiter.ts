import { Injectable } from '@nestjs/common';
import { Contract } from 'web3-eth-contract';

import { READER } from '../constant';
import { Web3Service } from '../web3/web3.service';
import { readerAbi } from '@app/core/abi/contracts.json';

@Injectable()
export class ReaderOrbiterCore {
  constructor(private readonly web3Service: Web3Service) {}

  contract(): Contract {
    return this.web3Service.getContract(READER, readerAbi);
  }

  async marketInfoByAccount(account: string): Promise<{
    totalSupply: string;
    totalBorrow: string;
    totalCollateral: string;
    availableToBorrow: string;
    availableToWithdraw: string;
    supplied: { oToken: string; totalSupply: string; collateral: boolean }[];
    borrowed: { oToken: string; totalBorrow: string }[];
  }> {
    const {
      0: {
        totalSupply,
        totalBorrow,
        totalCollateral,
        availableToBorrow,
        availableToWithdraw,
      },
      1: supplied,
      2: borrowed,
    } = await this.contract().methods.marketInfoByAccount(account).call();

    return {
      totalSupply,
      totalBorrow,
      totalCollateral,
      availableToBorrow,
      availableToWithdraw,
      supplied,
      borrowed,
    };
  }
}
