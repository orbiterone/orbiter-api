import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (request.headers && request.headers['x-orbiter-api-key']) {
      const apiKey = request.headers['x-orbiter-api-key'];
      if (apiKey) {
        if (apiKey == process.env.API_KEY) {
          return true;
        }
      }
    }

    throw new UnauthorizedException();
  }
}
