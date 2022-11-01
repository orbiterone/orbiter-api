import { User } from '@app/core/schemas/user.schema';
import { Injectable } from '@nestjs/common';

import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(public readonly userRepository: UserRepository) {}

  async createUpdateGetUser(address: string): Promise<User> {
    return await this.userRepository.findOneAndUpdate({ address });
  }
}
