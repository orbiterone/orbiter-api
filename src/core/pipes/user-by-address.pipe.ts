import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { isEthereumAddress } from 'class-validator';
import { UserRepository } from '@app/user/user.repository';

@Injectable()
export class UserByAddressPipe implements PipeTransform<string> {
  constructor(private readonly userRepository: UserRepository) {}

  async transform(value: string, metadata: ArgumentMetadata) {
    if (!value) return null;
    if (!isEthereumAddress(value))
      throw new HttpException(
        'Address is not correct.',
        HttpStatus.BAD_REQUEST,
      );
    const user = await this.userRepository.getUserModel().findOneAndUpdate(
      { address: { $regex: value, $options: 'i' } },
      {
        $set: {
          lastRequest: new Date(),
        },
      },
      { new: true },
    );

    return user;
  }
}
