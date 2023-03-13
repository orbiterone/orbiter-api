import { Injectable } from '@nestjs/common';
import { Timeout } from '@nestjs/schedule';

import { EventService } from './event.service';

@Injectable()
export class LotteryEvent extends EventService {
  @Timeout(5000)
  async addListenContract() {}
}
