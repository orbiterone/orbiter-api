import { Injectable } from '@nestjs/common';

import { TOKENS, SUPPORT_MARKET } from '../constant';
import { ControllerOrbiterCore } from '../orbiter/controller.orbiter';
import { Erc20OrbiterCore } from '../orbiter/erc20.orbiter';
import { OracleOrbiterCore } from '../orbiter/oracle.orbiter';
import { OTokenOrbiterCore } from '../orbiter/oToken.orbiter';
import { Web3Service } from '../web3/web3.service';

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
  ) {}

  abstract addListenContract(): void;
}
