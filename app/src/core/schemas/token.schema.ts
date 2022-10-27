import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { decimalObj } from './user.schema';

export type TokenDocument = Token & Document;

@Schema({ timestamps: true })
export class Token {
  _id: Types.ObjectId;

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

  @Prop()
  typeNetwork: string;

  @Prop()
  collateralFactor: number;

  @Prop()
  reserveFactor: number;

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
  totalReserves: Types.Decimal128;

  @Prop(decimalObj)
  lastPrice: Types.Decimal128;

  @Prop(decimalObj)
  liquidity: Types.Decimal128;

  @Prop()
  suppliers: number;

  @Prop()
  borrowers: number;

  createdAt: Date;

  updatedAt: Date;
}

export const TokenSchema = SchemaFactory.createForClass(Token).set('toJSON', {
  getters: true,
  transform: (doc, ret) => {
    if (ret.exchangeRate) {
      ret.exchangeRate = ret.exchangeRate.toString();
    }
    if (ret.supplyRate) {
      ret.supplyRate = ret.supplyRate.toString();
    }
    if (ret.borrowRate) {
      ret.borrowRate = ret.borrowRate.toString();
    }
    if (ret.totalSupply) {
      ret.totalSupply = ret.totalSupply.toString();
    }
    if (ret.totalBorrow) {
      ret.totalBorrow = ret.totalBorrow.toString();
    }
    if (ret.totalReserves) {
      ret.totalReserves = ret.totalReserves.toString();
    }
    if (ret.lastPrice) {
      ret.lastPrice = ret.lastPrice.toString();
    }
    if (ret.liquidity) {
      ret.liquidity = ret.liquidity.toString();
    }
    delete ret.__v;
    return ret;
  },
});
