import { Injectable } from '@nestjs/common';

import { LotteryRepository } from './lottery.repository';

@Injectable()
export class LotteryService {
  constructor(public readonly lotteryRepository: LotteryRepository) {}
}
