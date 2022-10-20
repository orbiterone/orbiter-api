import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { decimalObj } from './user.schema';

export type TokenDocument = Token & Document;

@Schema({ timestamps: true })
export class Token {
  @Prop()
  name: string;

  @Prop()
  symbol: string;

  @Prop()
  oTokenDecimal: number;

  @Prop()
  tokenDecimal: number;

  @Prop()
  oTokenAddress: string;

  @Prop()
  tokenAddress: string;

  @Prop(decimalObj)
  collateralFactor: Types.Decimal128;

  @Prop(decimalObj)
  reserveFactor: Types.Decimal128;

  @Prop(decimalObj)
  closeFactor: Types.Decimal128;

  @Prop(decimalObj)
  exchangeRate: Types.Decimal128;

  @Prop(decimalObj)
  supplyRate: Types.Decimal128;

  @Prop(decimalObj)
  borrowRate: Types.Decimal128;

  @Prop(decimalObj)
  totalSupply: Types.Decimal128;

  @Prop(decimalObj)
  totalBorrow: Types.Decimal128;

  @Prop(decimalObj)
  reserves: Types.Decimal128;

  @Prop()
  suppliers: number;

  @Prop()
  borrowers: number;
}

export const TokenSchema = SchemaFactory.createForClass(Token);
