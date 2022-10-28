import { Module } from '@nestjs/common';

import { CoreModule } from '../core.module';
import { OrbiterModule } from '../orbiter/orbiter.module';
import { ControllerEvent } from './controller.event';
import { MarketEvent } from './market.event';
import { TokenEvent } from './token.event';

@Module({
  imports: [CoreModule, OrbiterModule],
  providers: [TokenEvent, MarketEvent, ControllerEvent],
  exports: [TokenEvent, MarketEvent, ControllerEvent],
})
export class EventModule {}
