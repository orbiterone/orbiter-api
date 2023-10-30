import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import Web3 from 'web3';

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
import {
  HandledBlockNumber,
  HandledBlockNumberDocument,
} from '../schemas/handled-block-number.schema';
import { IncentiveOrbiterCore } from '../orbiter/incentive.orbiter';
import { ReaderOrbiterCore } from '../orbiter/reader.orbiter';
import { NftOrbiterCore } from '../orbiter/nft.orbiter';
import { StakingNftOrbiterCore } from '../orbiter/staking.nft.orbiter';
import { DiscordService } from '@app/core/discord/discord.service';
import { FpOrbiterCore } from '../orbiter/fp.orbiter';

@Injectable()
export abstract class HttpEventAbstractService {
  protected readonly contracts = {
    tokens: TOKENS,
    supportMarkets: SUPPORT_MARKET,
  };

  protected web3 = new Web3();

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
    protected readonly fpOrbiterCore: FpOrbiterCore,
    protected readonly stakingNftOrbiterCore: StakingNftOrbiterCore,
    protected readonly eventEmitter: EventEmitter2,
    protected readonly userService: UserService,
    protected readonly assetService: AssetService,
    protected readonly transactionService: TransactionService,
    protected readonly lotteryService: LotteryService,
    protected readonly discordService: DiscordService,
  ) {}
}
