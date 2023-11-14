import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Model } from 'mongoose';
import { Log } from 'web3-core';
import { InjectModel } from '@nestjs/mongoose';
import Web3 from 'web3';

import { AssetService } from '@app/asset/asset.service';
import { TransactionService } from '@app/transaction/transaction.service';
import { UserService } from '@app/user/user.service';
import { TOKENS, SUPPORT_MARKET, SUPPORT_NETWORKS } from '../constant';
import { ControllerOrbiterCore } from '../orbiter/controller.orbiter';
import { Erc20OrbiterCore } from '../orbiter/erc20.orbiter';
import { OracleOrbiterCore } from '../orbiter/oracle.orbiter';
import { OTokenOrbiterCore } from '../orbiter/oToken.orbiter';
import { LotteryOrbiterCore } from '../orbiter/lottery.orbiter';
import { Web3Service } from '../web3/web3.service';
import { LotteryService } from '@app/lottery/lottery.service';
import {
  HttpEventListener,
  ISubscriberContract,
} from './interfaces/http-event.interface';
import {
  HandledBlockNumber,
  HandledBlockNumberDocument,
} from '../schemas/handled-block-number.schema';
import { DiscordService } from '@app/core/discord/discord.service';
import { IncentiveOrbiterCore } from '../orbiter/incentive.orbiter';
import { ReaderOrbiterCore } from '../orbiter/reader.orbiter';
import { NftOrbiterCore } from '../orbiter/nft.orbiter';
import { StakingNftOrbiterCore } from '../orbiter/staking.nft.orbiter';

@Injectable()
export class HttpEventService {
  protected readonly contracts = {
    tokens: TOKENS,
    supportMarkets: SUPPORT_MARKET,
  };

  protected web3 = new Web3();

  private sync = {};

  private subscribers: Record<string, ISubscriberContract[]> = {};

  private fetchEventsInterval = 5000;

  private maxBatchBlockNumber = 50;

  private blocksRange = 500;

  protected autoCleanTarget = 100;

  protected zeroAddress = '0x0000000000000000000000000000000000000000';

  constructor(
    @InjectModel(HandledBlockNumber.name)
    protected readonly handledBlockNumberModel: Model<HandledBlockNumberDocument>,
    protected readonly web3Service: Web3Service,
    protected readonly oTokenCore: OTokenOrbiterCore,
    protected readonly erc20OrbierCore: Erc20OrbiterCore,
    protected readonly controllerOrbiterCore: ControllerOrbiterCore,
    protected readonly oracleOrbiterCore: OracleOrbiterCore,
    protected readonly lotteryOrbiterCore: LotteryOrbiterCore,
    protected readonly incentiveOrbiterCore: IncentiveOrbiterCore,
    protected readonly readerOrbiterCore: ReaderOrbiterCore,
    protected readonly nftOrbiterCore: NftOrbiterCore,
    protected readonly stakingNftOrbiterCore: StakingNftOrbiterCore,
    protected readonly eventEmitter: EventEmitter2,
    protected readonly userService: UserService,
    protected readonly assetService: AssetService,
    protected readonly transactionService: TransactionService,
    protected readonly lotteryService: LotteryService,
    protected readonly discordService: DiscordService,
  ) {}

  onModuleInit() {
    const networks = SUPPORT_NETWORKS;

    if (networks && networks.length) {
      for (const network of networks) {
        setTimeout(async () => {
          const lastProcessedBlockNumberInDB =
            await this.handledBlockNumberModel
              .findOne({ typeNetwork: network })
              .sort({ toBlock: -1 })
              .limit(1);

          let lastProcessedBlockNumber =
            lastProcessedBlockNumberInDB?.toBlock ||
            (await this.web3Service.getClient(network).eth.getBlockNumber());

          let handledCounter = 0;
          let minDate = new Date();

          while (true) {
            try {
              if (!this.sync[network] == true) {
                if (handledCounter > this.autoCleanTarget) {
                  await this.cleanHandledBlockNumber(minDate, network);
                  handledCounter = 0;
                  minDate = new Date();
                }

                const currentBlockNumber = await this.web3Service
                  .getClient(network)
                  .eth.getBlockNumber();

                if (currentBlockNumber > lastProcessedBlockNumber) {
                  const fromBlock = lastProcessedBlockNumber + 1;

                  let toBlock = currentBlockNumber;
                  if (toBlock - fromBlock > this.maxBatchBlockNumber) {
                    toBlock = fromBlock + this.maxBatchBlockNumber;
                  }
                  if (fromBlock > toBlock) {
                    toBlock = fromBlock;
                  }
                  this.sync[network] = true;

                  const events = await this.handleContractBlockNumbers(
                    fromBlock,
                    toBlock,
                    network,
                  );
                  if (this.subscribers[network]?.length && events.length) {
                    for (const subscriber of this.subscribers[network]) {
                      const filterEvent = events.filter(
                        (el) =>
                          el.address.toLowerCase() ==
                          subscriber.contractAddress.toLowerCase(),
                      );
                      if (filterEvent.length) {
                        await subscriber.eventHandlerCallback(filterEvent);
                      }
                    }
                  }

                  await this.handledBlockNumberModel.create({
                    fromBlock,
                    toBlock,
                    typeNetwork: network,
                  });

                  handledCounter++;

                  lastProcessedBlockNumber = toBlock;
                  this.sync[network] = false;
                }
              }
              await this.wait(this.fetchEventsInterval);
            } catch (err) {
              console.error(err);
              this.sync[network] = false;
              await this.wait(this.fetchEventsInterval);
            }
          }
        }, 10000);
      }
    }
  }

  @OnEvent(HttpEventListener.ADD_LISTEN)
  async addListenContract({
    contractAddress,
    typeNetwork,
    eventHandlerCallback,
  }: ISubscriberContract) {
    if (!this.subscribers[typeNetwork]) {
      this.subscribers[typeNetwork] = [];
    }
    this.subscribers[typeNetwork].push({
      contractAddress,
      typeNetwork,
      eventHandlerCallback,
    });
  }

  protected async handleContractBlockNumbers(
    fromBlock: number,
    toBlock: number,
    typeNetwork: string,
  ): Promise<Log[]> {
    return await this.web3Service.getClient(typeNetwork).eth.getPastLogs({
      fromBlock,
      toBlock,
    });
  }

  protected async cleanHandledBlockNumber(minDate: Date, typeNetwork: string) {
    await this.handledBlockNumberModel.deleteMany({
      createdAt: { $lt: minDate },
      typeNetwork,
    });
  }

  protected wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
