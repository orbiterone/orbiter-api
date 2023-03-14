import { BaseRepository } from '@app/core/repositories/base.repository';
import {
  LotteryParticipant,
  LotteryParticipantDocument,
} from '@app/core/schemas/lottery.participant.schema';
import { Lottery, LotteryDocument } from '@app/core/schemas/lottery.schema';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class LotteryRepository extends BaseRepository {
  constructor(
    @InjectModel(Lottery.name)
    private lotteryModel: Model<LotteryDocument>,
    @InjectModel(LotteryParticipant.name)
    private lotteryParticipantModel: Model<LotteryParticipantDocument>,
  ) {
    super();
  }

  getLotteryModel(): Model<LotteryDocument> {
    return this.lotteryModel;
  }

  getLotteryParticipantModel(): Model<LotteryParticipantDocument> {
    return this.lotteryParticipantModel;
  }

  async lotteryCreate(data: any): Promise<Lottery> {
    const res = new this.lotteryModel(data);
    return res.save();
  }

  async lotteryParticipantCreate(data: any): Promise<LotteryParticipant> {
    const res = new this.lotteryParticipantModel(data);
    return res.save();
  }
}
