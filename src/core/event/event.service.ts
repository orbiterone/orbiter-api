import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

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
import { DiscordService } from '@app/core/discord/discord.service';

@Injectable()
export abstract class EventService {
  public readonly contracts = {
    tokens: TOKENS,
    supportMarkets: SUPPORT_MARKET,
  };

  constructor(
    public readonly web3Service: Web3Service,
    public readonly oTokenCore: OTokenOrbiterCore,
    public readonly erc20OrbierCore: Erc20OrbiterCore,
    public readonly controllerOrbiterCore: ControllerOrbiterCore,
    public readonly oracleOrbiterCore: OracleOrbiterCore,
    public readonly lotteryOrbiterCore: LotteryOrbiterCore,
    public readonly eventEmitter: EventEmitter2,
    public readonly userService: UserService,
    public readonly assetService: AssetService,
    public readonly transactionService: TransactionService,
    public readonly lotteryService: LotteryService,
    public readonly discordService: DiscordService,
  ) {}

  abstract addListenContract(): void;
}
