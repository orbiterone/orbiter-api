import { Module } from '@nestjs/common';
import { CoreModule } from '../core.module';

import { ComptrollerOrbiterCore } from './comptroller.orbiter';
import { Erc20OrbiterCore } from './erc20.orbiter';
import { OracleOrbiterCore } from './oracle.orbiter';
import { OTokenOrbiterCore } from './oToken.orbiter';

@Module({
  imports: [CoreModule],
  providers: [
    OTokenOrbiterCore,
    Erc20OrbiterCore,
    ComptrollerOrbiterCore,
    OracleOrbiterCore,
  ],
  exports: [
    OTokenOrbiterCore,
    Erc20OrbiterCore,
    ComptrollerOrbiterCore,
    OracleOrbiterCore,
  ],
})
export class OrbiterModule {}
