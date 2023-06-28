import { EventData, Contract } from 'web3-eth-contract';

import { HandledEventsType } from '@app/core/schemas/handled-block-number.schema';

export class IAddListenContract {
  contract: Contract;
  contractType: HandledEventsType;
  network: string;
  eventHandlerCallback: (events: EventData[]) => Promise<void>;
}

class DefaultEvent {
  to: string;
  erc20TokenAddress: string;
}

export class INftMintedEvent extends DefaultEvent {
  cost: string;
  txHash: string;
}
