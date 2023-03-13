import { Module } from '@nestjs/common';
import { CoreModule } from '../core.module';

import { ControllerOrbiterCore } from './controller.orbiter';
import { Erc20OrbiterCore } from './erc20.orbiter';
import { IncentiveOrbiterCore } from './incentive.orbiter';
import { OracleOrbiterCore } from './oracle.orbiter';
import { OTokenOrbiterCore } from './oToken.orbiter';
import { ReaderOrbiterCore } from './reader.orbiter';

@Module({
  imports: [CoreModule],
  providers: [
    OTokenOrbiterCore,
    Erc20OrbiterCore,
    ControllerOrbiterCore,
    OracleOrbiterCore,
    ReaderOrbiterCore,
    IncentiveOrbiterCore,
  ],
  exports: [
    OTokenOrbiterCore,
    Erc20OrbiterCore,
    ControllerOrbiterCore,
    OracleOrbiterCore,
    ReaderOrbiterCore,
    IncentiveOrbiterCore,
  ],
})
export class OrbiterModule {}
