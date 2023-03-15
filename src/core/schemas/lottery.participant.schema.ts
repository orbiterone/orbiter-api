import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Lottery } from './lottery.schema';
import { User } from './user.schema';

export type LotteryParticipantDocument = LotteryParticipant & Document;

@Schema({ timestamps: true })
export class LotteryParticipant {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: User | Types.ObjectId | string;

  @Prop({ type: Types.ObjectId, ref: 'Lottery' })
  lottery: Lottery | Types.ObjectId | string;

  @Prop()
  countTickets: number;

  createdAt: Date;

  updatedAt: Date;
}

export const LotteryParticipantSchema =
  SchemaFactory.createForClass(LotteryParticipant);
