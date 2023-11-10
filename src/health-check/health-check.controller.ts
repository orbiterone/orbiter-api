import { Controller, Get, HttpStatus, Response } from '@nestjs/common';
import jsend from 'jsend';

@Controller('health')
export class HealthController {
  @Get()
  healthCheck(@Response() res: any): string {
    return res.status(HttpStatus.OK).json(jsend.success('Server is healthy!'));
  }
}
