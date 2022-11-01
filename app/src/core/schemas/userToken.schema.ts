import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Token } from './token.schema';
import { decimalObj, User } from './user.schema';

export type UserTokenDocument = UserToken & Document;

@Schema({ timestamps: true })
export class UserToken {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Token' })
  token: Token | Types.ObjectId | string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: User | Types.ObjectId | string;

  @Prop(decimalObj)
  totalSupply: Types.Decimal128;

  @Prop(decimalObj)
  totalBorrow: Types.Decimal128;

  @Prop()
  typeNetwork: string;

  @Prop({ default: false })
  collateral: boolean;
}

export const UserTokenSchema = SchemaFactory.createForClass(UserToken);
