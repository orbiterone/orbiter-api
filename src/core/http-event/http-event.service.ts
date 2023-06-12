import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Contract, EventData } from 'web3-eth-contract';

import { AssetService } from '@app/asset/asset.service';
import { TransactionService } from '@app/transaction/transaction.service';
import { UserService } from '@app/user/user.service';
import { TOKENS, SUPPORT_MARKET } from '../constant';
import { ControllerOrbiterCore } from '../orbiter/controller.orbiter';
import { Erc20OrbiterCore } from '../orbiter/erc20.orbiter';
import { OracleOrbiterCore } from '../orbiter/oracle.orbiter';
import { OTokenOrbiterCore } from '../orbiter/oToken.orbiter';
import { LotteryOrbiterCore } from '../orbiter/lottery.orbiter';
import { Web3Service } from '../web3/web3.service';
import { LotteryService } from '@app/lottery/lottery.service';
import { IAddListenContract } from './interfaces/http-event.interface';
import {
  HandledBlockNumber,
  HandledBlockNumberDocument,
  HandledEventsType,
} from '../schemas/handled-block-number.schema';

@Injectable()
export abstract class HttpEventService {
  protected readonly contracts = {
    tokens: TOKENS,
    supportMarkets: SUPPORT_MARKET,
  };

  private fetchEventsInterval = 10000;

  private blocksRange = 500;

  protected autoCleanTarget = 100;

  constructor(
    @InjectModel(HandledBlockNumber.name)
    protected readonly handledBlockNumberModel: Model<HandledBlockNumberDocument>,
    protected readonly web3Service: Web3Service,
    protected readonly oTokenCore: OTokenOrbiterCore,
    protected readonly erc20OrbierCore: Erc20OrbiterCore,
    protected readonly controllerOrbiterCore: ControllerOrbiterCore,
    protected readonly oracleOrbiterCore: OracleOrbiterCore,
    protected readonly lotteryOrbiterCore: LotteryOrbiterCore,
    protected readonly eventEmitter: EventEmitter2,
    protected readonly userService: UserService,
    protected readonly assetService: AssetService,
    protected readonly transactionService: TransactionService,
    protected readonly lotteryService: LotteryService,
  ) {}

  protected async addListenContract({
    contract,
    contractType,
    network,
    eventHandlerCallback,
  }: IAddListenContract) {
    const lastProcessedBlockNumberInDB = await this.handledBlockNumberModel
      .findOne({ type: contractType })
      .sort({ toBlock: -1 })
      .limit(1);

    let lastProcessedBlockNumber =
      lastProcessedBlockNumberInDB?.toBlock ||
      (await this.web3Service.getClient(network).eth.getBlockNumber());

    let handledCounter = 0;
    let minDate = new Date();

    while (true) {
      try {
        if (handledCounter > this.autoCleanTarget) {
          await this.cleanHandledBlockNumber(minDate, contractType);
          handledCounter = 0;
          minDate = new Date();
        }

        const currentBlockNumber = await this.web3Service
          .getClient(network)
          .eth.getBlockNumber();

        if (lastProcessedBlockNumber < currentBlockNumber) {
          const events = await this.handleContractBlockNumbers(
            lastProcessedBlockNumber + 1,
            currentBlockNumber,
            contract,
          );

          await eventHandlerCallback(events);

          await this.handledBlockNumberModel.create({
            fromBlock: lastProcessedBlockNumber + 1,
            toBlock: currentBlockNumber,
            type: contractType,
          });

          handledCounter++;

          lastProcessedBlockNumber = currentBlockNumber;
        }

        await this.wait(this.fetchEventsInterval);
      } catch (error) {
        console.error(error);
      }
    }
  }

  protected async handleContractBlockNumbers(
    lastProcessedBlockNumber: number,
    currentBlockNumber: number,
    contract: Contract,
  ): Promise<EventData[]> {
    const events: EventData[] = [];
    let fromBlock = lastProcessedBlockNumber;

    while (true) {
      const toBlock = fromBlock + this.blocksRange;

      const eventsRangeBlocks = await contract.getPastEvents('allEvents', {
        fromBlock,
        toBlock,
      });

      events.push(...eventsRangeBlocks);

      if (currentBlockNumber <= toBlock) {
        return events;
      }

      fromBlock = toBlock + 1;
    }
  }

  protected async cleanHandledBlockNumber(
    minDate: Date,
    type: HandledEventsType,
  ) {
    await this.handledBlockNumberModel.deleteMany({
      createdAt: { $lt: minDate },
      type,
    });
  }

  protected wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
