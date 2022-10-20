import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Token } from './token.schema';
import { decimalObj } from './user.schema';

export type MarketHistoryDocument = MarketHistory & Document;

@Schema({ timestamps: true })
export class MarketHistory {
  @Prop({ type: Types.ObjectId, ref: 'Token' })
  token: Token | Types.ObjectId | string;

  @Prop(decimalObj)
  supplyRate: Types.Decimal128;

  @Prop(decimalObj)
  borrowRate: Types.Decimal128;

  @Prop(decimalObj)
  totalSupply: Types.Decimal128;

  @Prop(decimalObj)
  totalBorrow: Types.Decimal128;
}

export const MarketHistorySchema = SchemaFactory.createForClass(MarketHistory);
