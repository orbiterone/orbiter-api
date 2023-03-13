import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { decimalObj } from './user.schema';

export type LotteryDocument = Lottery & Document;

@Schema({ timestamps: true })
export class Lottery {
  _id: Types.ObjectId;

  @Prop()
  lotteryId: number;

  @Prop()
  status: number;

  @Prop()
  startTime: Date;

  @Prop()
  endTime: Date;

  @Prop({ type: Types.Array })
  orbPerBracket: string[];

  @Prop({ type: Types.Array })
  countWinnersPerBracket: string[];

  @Prop(decimalObj)
  priceTicket: Types.Decimal128;

  @Prop(decimalObj)
  amountCollectedInOrb: Types.Decimal128;

  @Prop()
  finalNumber: number;
}

export const LotterySchema = SchemaFactory.createForClass(Lottery);
