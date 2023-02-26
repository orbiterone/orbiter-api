import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { AssetRepository } from '@app/asset/asset.repository';
import { isMongoId } from 'class-validator';

@Injectable()
export class TokenByIdPipe implements PipeTransform<string> {
  constructor(private readonly assetRepository: AssetRepository) {}

  async transform(value: string, metadata: ArgumentMetadata) {
    if (!value) return null;
    if (!isMongoId(value))
      throw new HttpException('Token is not correct.', HttpStatus.BAD_REQUEST);
    const token = await this.assetRepository
      .getTokenModel()
      .findById(new Types.ObjectId(value));

    if (!token) {
      throw new HttpException('Token not found.', HttpStatus.NOT_FOUND);
    }

    return token;
  }
}
