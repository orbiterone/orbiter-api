import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Token } from './token.schema';
import { decimalObj, User } from './user.schema';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'Token' })
  token: Token | Types.ObjectId | string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: User | Types.ObjectId | string;

  @Prop()
  event: string;

  @Prop()
  status: boolean;

  @Prop(decimalObj)
  amount: Types.Decimal128;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
