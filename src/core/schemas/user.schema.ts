import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as SchemaM } from 'mongoose';

export type UserDocument = User & Document;

export function Decimal128(item: string): Types.Decimal128 {
  return Types.Decimal128.fromString(item);
}

export const decimalObj = {
  type: SchemaM.Types.Decimal128,
  get: function (value: any): string {
    return value ? value.toString() : value;
  },
  set: (value: any) => {
    if (typeof value == 'string') {
      return Decimal128(value);
    } else if (typeof value == 'number') {
      return Decimal128(value.toString());
    } else {
      return value;
    }
  },
};

@Schema({ timestamps: true })
export class User {
  _id: Types.ObjectId;

  @Prop({ unique: true })
  address: string;

  @Prop()
  lastRequest: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
