import mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type HandledBlockNumberDocument = HandledBlockNumber & mongoose.Document;

export enum HandledEventsType {
  TOKEN = 'TOKEN',
  MARKET_TOKEN = 'MARKET_TOKEN',
  CONTROLLER = 'CONTROLLER',
  LOTTERY = 'LOTTERY',
  INCENTIVE = 'INCENTIVE',
  NFT = 'NFT',
  STAKING_NFT = 'STAKING_NFT',
}

@Schema()
export class HandledBlockNumber {
  @Prop({ required: true })
  fromBlock: number;

  @Prop({ required: true })
  toBlock: number;

  @Prop({ default: Date.now })
  createdAt?: Date;

  @Prop()
  type: HandledEventsType;
}

export const HandledBlockNumberSchema =
  SchemaFactory.createForClass(HandledBlockNumber);
