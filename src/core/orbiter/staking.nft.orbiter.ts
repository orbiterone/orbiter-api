import { Injectable } from '@nestjs/common';
import { Contract } from 'web3-eth-contract';

import { STAKING } from '../constant';
import { Web3Service } from '../web3/web3.service';
import { stakeNftAbi } from '@app/core/abi/contracts.json';

@Injectable()
export class StakingNftOrbiterCore {
  constructor(private readonly web3Service: Web3Service) {}

  contract(websocket = false): Contract {
    switch (websocket) {
      case true:
        return this.web3Service.getContractByWebsocket(STAKING, stakeNftAbi);
      case false:
        return this.web3Service.getContract(STAKING, stakeNftAbi);
    }
  }
}
