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

const { NODE_TYPE: typeNetwork } = process.env;

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

  getClient(): Web3 {
    const urlNode = NODE_GETH[typeNetwork];

    if (!this.nodeClient[typeNetwork]) {
      const client = new Web3(new Web3.providers.HttpProvider(urlNode));
      this.nodeClient[typeNetwork] = client;

      return this.nodeClient[typeNetwork];
    } else {
      return this.nodeClient[typeNetwork];
    }
  }

  getClientWebsocket(): Web3 {
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

  getContract(contractAddress: string, abi: any): Contract {
    if (
      !this.contracts[typeNetwork] ||
      !this.contracts[typeNetwork][contractAddress]
    ) {
      const client = this.getClient();
      const contract = new client.eth.Contract(abi, contractAddress);
      if (!this.contracts[typeNetwork]) {
        this.contracts[typeNetwork] = {};
      }
      this.contracts[typeNetwork][contractAddress] = contract;
    }

    return this.contracts[typeNetwork][contractAddress];
  }

  getContractByWebsocket(contractAddress: string, abi: any): Contract {
    if (
      !this.contractsWebsocket[typeNetwork] ||
      !this.contractsWebsocket[typeNetwork][contractAddress]
    ) {
      const client = this.getClientWebsocket();
      const contract = new client.eth.Contract(abi, contractAddress);
      if (!this.contractsWebsocket[typeNetwork]) {
        this.contractsWebsocket[typeNetwork] = {};
      }
      this.contractsWebsocket[typeNetwork][contractAddress] = contract;
    }

    return this.contractsWebsocket[typeNetwork][contractAddress];
  }

  async createTx(
    parameter: Record<string, any>,
    ownerKey: string,
  ): Promise<string> {
    const web3 = this.getClient();
    return new Promise(async (resolve, reject) => {
      try {
        const nonce = await web3.eth.getTransactionCount(
          parameter.from,
          'pending',
        );

        const gasLimit = await web3.eth.estimateGas(parameter);
        parameter.gasLimit = web3.utils.toHex(gasLimit);
        const gasPrice = +(await web3.eth.getGasPrice());
        parameter.gasPrice = web3.utils.toHex(gasPrice);
        parameter.value = '0x0';
        parameter.nonce = nonce;

        const signedTx = await web3.eth.accounts.signTransaction(
          parameter,
          ownerKey.replace('0x', ''),
        );

        await web3.eth
          .sendSignedTransaction(signedTx.rawTransaction)
          .once('transactionHash', (hash) => {
            return resolve(hash);
          })
          .on('error', (err) => reject(err));
      } catch (err) {
        return reject(err);
      }
    });
  }
}
