import { Injectable } from '@nestjs/common';
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';

const {
  WSS_NODE_MOONRIVER_HOST,
  WSS_NODE_MOONBASE_HOST,
  WSS_NODE_MOONBEAM_HOST,
  NODE_MOONRIVER_HOST,
  NODE_MOONBASE_HOST,
  NODE_MOONBEAM_HOST,
} = process.env;

const NODE_GETH_WEBSOCKET = {
  moonbase: WSS_NODE_MOONBASE_HOST,
  moonriver: WSS_NODE_MOONRIVER_HOST,
  moonbeam: WSS_NODE_MOONBEAM_HOST,
};

const NODE_GETH = {
  moonbase: NODE_MOONBASE_HOST,
  moonriver: NODE_MOONRIVER_HOST,
  moonbeam: NODE_MOONBEAM_HOST,
};

@Injectable()
export class Web3Service {
  private nodeClientWebsocket = {
    moonbase: null,
    moonriver: null,
    moonbeam: null,
  };
  private nodeClient = {
    moonbase: null,
    moonriver: null,
    moonbeam: null,
  };
  private contracts = [];

  private contractsWebsocket = [];

  getClient(typeNetwork: string): Web3 {
    const urlNode = NODE_GETH[typeNetwork];

    if (!this.nodeClient[typeNetwork]) {
      const client = new Web3(new Web3.providers.HttpProvider(urlNode));
      this.nodeClient[typeNetwork] = client;

      return this.nodeClient[typeNetwork];
    } else {
      return this.nodeClient[typeNetwork];
    }
  }

  getClientWebsocket(typeNetwork: string): Web3 {
    const urlNode = NODE_GETH_WEBSOCKET[typeNetwork];

    if (!this.nodeClientWebsocket[typeNetwork]) {
      let provider = new Web3.providers.WebsocketProvider(urlNode, {
        reconnect: { auto: true, delay: 5000 },
      });
      const client = new Web3(provider);
      provider.on('error', console.error);
      provider.on('end', () => {
        console.log('WS closed');
        console.log(`Attempting to reconnect... ${typeNetwork}`);
        provider = new Web3.providers.WebsocketProvider(urlNode);

        provider.on('connect', function () {
          console.log(`WSS Reconnected. ${typeNetwork}`);
        });

        client.setProvider(provider);
      });

      this.nodeClientWebsocket[typeNetwork] = client;

      return this.nodeClientWebsocket[typeNetwork];
    }
    return this.nodeClientWebsocket[typeNetwork];
  }

  getContract(
    typeNetwork: string,
    contractAddress: string,
    abi: any,
  ): Contract {
    if (
      !this.contracts[typeNetwork] ||
      !this.contracts[typeNetwork][contractAddress]
    ) {
      const client = this.getClient(typeNetwork);
      const contract = new client.eth.Contract(abi, contractAddress);
      if (!this.contracts[typeNetwork]) {
        this.contracts[typeNetwork] = {};
      }
      this.contracts[typeNetwork][contractAddress] = contract;
    }

    return this.contracts[typeNetwork][contractAddress];
  }

  getContractByWebsocket(
    typeNetwork: string,
    contractAddress: string,
    abi: any,
  ): Contract {
    if (
      !this.contractsWebsocket[typeNetwork] ||
      !this.contractsWebsocket[typeNetwork][contractAddress]
    ) {
      const client = this.getClientWebsocket(typeNetwork);
      const contract = new client.eth.Contract(abi, contractAddress);
      if (!this.contractsWebsocket[typeNetwork]) {
        this.contractsWebsocket[typeNetwork] = {};
      }
      this.contractsWebsocket[typeNetwork][contractAddress] = contract;
    }

    return this.contractsWebsocket[typeNetwork][contractAddress];
  }
}
