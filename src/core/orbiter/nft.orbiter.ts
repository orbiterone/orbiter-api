import { Injectable } from '@nestjs/common';
import { Contract } from 'web3-eth-contract';

import { NFT } from '../constant';
import { Web3Service } from '../web3/web3.service';
import { nftAbi } from '@app/core/abi/contracts.json';

@Injectable()
export class NftOrbiterCore {
  constructor(private readonly web3Service: Web3Service) {}

  contract(websocket = false): Contract {
    switch (websocket) {
      case true:
        return this.web3Service.getContractByWebsocket(NFT, nftAbi);
      case false:
        return this.web3Service.getContract(NFT, nftAbi);
    }
  }
}
