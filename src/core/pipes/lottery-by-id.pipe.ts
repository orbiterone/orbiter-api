import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { LotteryRepository } from '@app/lottery/lottery.repository';

@Injectable()
export class LotteryByIdPipe implements PipeTransform<string> {
  constructor(private readonly lotteryRepository: LotteryRepository) {}

  async transform(value: string, metadata: ArgumentMetadata) {
    if (!value) return null;
    const lottery = await this.lotteryRepository
      .getLotteryModel()
      .findOne({ lotteryId: +value });
    if (!lottery) {
      throw new HttpException('Lottery not found', HttpStatus.NOT_FOUND);
    }

    return lottery;
  }
}
