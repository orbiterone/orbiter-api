import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Decimal128, decimalObj } from './user.schema';

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

  @Prop({ type: Types.Array, default: [] })
  orbPerBracket: string[];

  @Prop({ type: Types.Array, default: [] })
  countWinnersPerBracket: string[];

  @Prop(decimalObj)
  priceTicket: Types.Decimal128;

  @Prop({ ...decimalObj, default: Decimal128('0') })
  amountCollectedInOrb: Types.Decimal128;

  @Prop({ default: '0' })
  finalNumber: string;

  @Prop({ default: 0 })
  countWinningTickets: number;
}

export const LotterySchema = SchemaFactory.createForClass(Lottery);
