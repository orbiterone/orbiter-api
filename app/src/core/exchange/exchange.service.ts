import { Injectable } from '@nestjs/common';
import { CpayExchangeSDK } from 'cpay-exchange-node-api-sdk';
import { Decimal } from 'decimal.js';

const { COINPRICE_KEY, REDIS_URI } = process.env;

Decimal.set({ toExpNeg: -30, toExpPos: 30 });

@Injectable()
export class ExchangeService {
  private exchangeApi: CpayExchangeSDK;

  private getExchangeAPI(): CpayExchangeSDK {
    if (!this.exchangeApi) {
      this.exchangeApi = new CpayExchangeSDK({
        apiKey: COINPRICE_KEY,
        redisUri: REDIS_URI,
      });
    }

    return this.exchangeApi;
  }

  async getPrice(
    from: string,
    to = 'USDT',
    exchangeId?: number,
  ): Promise<number> {
    let obj = {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
    };
    if (exchangeId) obj = Object.assign(obj, { exchangeId });

    const { price = 0 } = await this.getExchangeAPI().convertPairs(obj);

    return price;
  }
}
