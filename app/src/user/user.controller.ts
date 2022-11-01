import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiKeyGuard } from '@app/core/guard/apikey';
import { UserService } from './user.service';

@Controller('users')
@UseGuards(ApiKeyGuard)
@ApiTags('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
}
