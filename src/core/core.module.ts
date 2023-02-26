import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { Web3Service } from './web3/web3.service';
import { HttpRequestsService } from './http-requests/http-requests.service';
import { ExchangeService } from './exchange/exchange.service';

@Module({
  imports: [HttpModule],
  providers: [Web3Service, HttpRequestsService, ExchangeService],
  exports: [Web3Service, HttpRequestsService, ExchangeService],
})
export class CoreModule {}
