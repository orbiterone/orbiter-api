import { Module } from '@nestjs/common';
import { CoreModule } from '../core.module';

import { ControllerOrbiterCore } from './controller.orbiter';
import { Erc20OrbiterCore } from './erc20.orbiter';
import { IncentiveOrbiterCore } from './incentive.orbiter';
import { LotteryOrbiterCore } from './lottery.orbiter';
import { OracleOrbiterCore } from './oracle.orbiter';
import { OTokenOrbiterCore } from './oToken.orbiter';
import { ReaderOrbiterCore } from './reader.orbiter';
import { NftOrbiterCore } from './nft.orbiter';
import { StakingNftOrbiterCore } from './staking.nft.orbiter';
import { FpOrbiterCore } from './fp.orbiter';

@Module({
  imports: [CoreModule],
  providers: [
    OTokenOrbiterCore,
    Erc20OrbiterCore,
    ControllerOrbiterCore,
    OracleOrbiterCore,
    ReaderOrbiterCore,
    IncentiveOrbiterCore,
    LotteryOrbiterCore,
    NftOrbiterCore,
    StakingNftOrbiterCore,
    FpOrbiterCore,
  ],
  exports: [
    OTokenOrbiterCore,
    Erc20OrbiterCore,
    ControllerOrbiterCore,
    OracleOrbiterCore,
    ReaderOrbiterCore,
    IncentiveOrbiterCore,
    LotteryOrbiterCore,
    NftOrbiterCore,
    StakingNftOrbiterCore,
    FpOrbiterCore,
  ],
})
export class OrbiterModule {}
