import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BigNumber } from 'bignumber.js';
import { Document, Types } from 'mongoose';

import { decimalObj } from './user.schema';

export type TokenDocument = Token & Document;

BigNumber.config({ EXPONENTIAL_AT: [-100, 100] });

@Schema({ timestamps: true })
export class Token {
  _id: Types.ObjectId;

  @Prop()
  name: string;

  @Prop()
  fullName: string;

  @Prop()
  symbol: string;

  @Prop()
  image: string;

  @Prop()
  color: string;

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

  @Prop()
  supplyPaused: boolean;

  @Prop()
  borrowPaused: boolean;

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

  @Prop({ type: [String] })
  suppliers: string[];

  @Prop({ type: [String] })
  borrowers: string[];

  @Prop(
    raw([
      {
        symbol: {
          type: String,
        },
        address: {
          type: String,
        },
        supplyApy: decimalObj,
        borrowApy: decimalObj,
      },
    ]),
  )
  incentives: {
    symbol: string;
    address: string;
    supplyApy: Types.Decimal128;
    borrowApy: Types.Decimal128;
  }[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: true })
  isTxView: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  countSuppliers: number;
  countBorrowers: number;
  utilization: number;

  createdAt: Date;

  updatedAt: Date;
}

export const TokenSchema = SchemaFactory.createForClass(Token).set('toJSON', {
  getters: true,
  transform: (doc, ret) => {
    if (ret.exchangeRate) {
      ret.exchangeRate = new BigNumber(ret.exchangeRate.toString()).toString();
    }
    if (ret.supplyRate) {
      ret.supplyRate = new BigNumber(ret.supplyRate.toString()).toString();
    }
    if (ret.borrowRate) {
      ret.borrowRate = new BigNumber(ret.borrowRate.toString()).toString();
    }
    if (ret.totalSupply) {
      ret.totalSupply = new BigNumber(ret.totalSupply.toString()).toString();
    }
    if (ret.totalBorrow) {
      ret.totalBorrow = new BigNumber(ret.totalBorrow.toString()).toString();
    }
    if (ret.totalReserves) {
      ret.totalReserves = new BigNumber(
        ret.totalReserves.toString(),
      ).toString();
    }
    if (ret.lastPrice) {
      ret.lastPrice = ret.lastPrice.toString();
    }
    if (ret.liquidity) {
      ret.liquidity = new BigNumber(ret.liquidity.toString()).toString();
    }
    if (ret.incentives && ret.incentives.length > 0) {
      for (const i in ret.incentives) {
        ret.incentives[i].supplyApy = new BigNumber(
          ret.incentives[i].supplyApy.toString(),
        ).toString();
        ret.incentives[i].borrowApy = new BigNumber(
          ret.incentives[i].borrowApy.toString(),
        ).toString();
      }
    }
    ret.countSuppliers = ret.suppliers ? ret.suppliers.length : 0;
    ret.countBorrowers = ret.borrowers ? ret.borrowers.length : 0;
    ret.utilization = ret.totalSupply
      ? new BigNumber(ret.totalBorrow.toString() || 0)
          .div(ret.totalSupply.toString())
          .multipliedBy(100)
          .toNumber()
      : 0;
    delete ret.__v;
    delete ret.id;
    delete ret.suppliers;
    delete ret.borrowers;
    return ret;
  },
});
