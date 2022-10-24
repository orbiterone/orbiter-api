import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { Web3Service } from './web3/web3.service';
import { HttpRequestsService } from './http-requests/http-requests.service';

@Module({
  imports: [HttpModule],
  providers: [Web3Service, HttpRequestsService],
  exports: [Web3Service, HttpRequestsService],
})
export class CoreModule {}
