import { Injectable, OnModuleInit } from '@nestjs/common';
import Web3 from 'web3';
import BigNumber from 'bignumber.js';

import { Web3Service } from '@app/core/web3/web3.service';
import { AssetRepository } from './asset.repository';
import { Decimal128 } from '@app/core/schemas/user.schema';
import { DEFAULT_TOKEN, SUPPORT_MARKET } from '@app/core/constant';
import { Token } from '@app/core/schemas/token.schema';
import { OTokenOrbiterCore } from '@app/core/orbiter/oToken.orbiter';
import { Erc20OrbiterCore } from '@app/core/orbiter/erc20.orbiter';
import { ControllerOrbiterCore } from '@app/core/orbiter/controller.orbiter';
import { OracleOrbiterCore } from '@app/core/orbiter/oracle.orbiter';

const web3 = new Web3();

const { NODE_TYPE } = process.env;

@Injectable()
export class AssetService implements OnModuleInit {
  constructor(
    private readonly web3Service: Web3Service,
    private readonly assetRepository: AssetRepository,
    private readonly oTokenCore: OTokenOrbiterCore,
    private readonly erc20OrbierCore: Erc20OrbiterCore,
    private readonly comptrollerOrbiterCore: ControllerOrbiterCore,
    private readonly oracleOrbiterCore: OracleOrbiterCore,
  ) {
    (async () => {
      this.oracleOrbiterCore.setToken(
        await this.comptrollerOrbiterCore.oracle(),
      );
    })();
  }

  private async getAssetInfoFromBlockchain(oToken: string) {
    const client = this.web3Service.getClient();
    this.oTokenCore.setToken(oToken);

    let underlying: string = null;
    if (oToken.toLowerCase() !== DEFAULT_TOKEN.toLowerCase()) {
      underlying = await this.oTokenCore.underlying();
    }
    const tokenData = {
      name: ['moonriver', 'moonbase'].includes(NODE_TYPE)
        ? 'Moonriver'
        : 'Moonbeam',
      symbol: ['moonriver', 'moonbase'].includes(NODE_TYPE) ? 'MOVR' : 'GLMR',
      tokenDecimal: 18,
    };
    if (underlying) {
      this.erc20OrbierCore.setToken(underlying);
      tokenData.name = await this.erc20OrbierCore.name();
      tokenData.symbol = await this.erc20OrbierCore.symbol();
      tokenData.tokenDecimal = +(await this.erc20OrbierCore.decimals());
    }
    const collateralFactorMantissa =
      await this.comptrollerOrbiterCore.collateralFactorMantissa(oToken);

    const totalSupply = new BigNumber(await this.oTokenCore.totalSupply()).div(
      Math.pow(10, tokenData.tokenDecimal),
    );
    const totalBorrow = new BigNumber(await this.oTokenCore.totalBorrows()).div(
      Math.pow(10, tokenData.tokenDecimal),
    );
    const totalReserves = new BigNumber(
      await this.oTokenCore.totalReserves(),
    ).div(Math.pow(10, tokenData.tokenDecimal));
    const lastPrice = web3.utils.fromWei(
      `${await this.oracleOrbiterCore.getUnderlyingPrice(oToken)}`,
      'ether',
    );
    const exchangeRate = new BigNumber(
      await this.oTokenCore.exchangeRateCurrent(),
    ).div(Math.pow(10, 18 + tokenData.tokenDecimal - 8));
    const supplyApy = await this.oTokenCore.supplyApy();
    const borrowApy = await this.oTokenCore.borrowApy();

    let liquidity = new BigNumber(0);
    if (!underlying) {
      liquidity = new BigNumber(
        `${client.utils.fromWei(await client.eth.getBalance(oToken), 'ether')}`,
      );
    } else {
      liquidity = new BigNumber(
        await this.erc20OrbierCore.balanceOf(oToken),
      ).div(Math.pow(10, tokenData.tokenDecimal));
    }

    return {
      oTokenAddress: oToken,
      oTokenDecimal: +(await this.oTokenCore.decimals()),
      tokenAddress: underlying || '',
      ...tokenData,
      typeNetwork: NODE_TYPE,
      collateralFactor:
        +web3.utils.fromWei(`${collateralFactorMantissa}`, 'ether') * 100,
      reserveFactor:
        +web3.utils.fromWei(
          `${await this.oTokenCore.reserveFactorMantissa()}`,
          'ether',
        ) * 100,
      totalSupply: Decimal128(totalSupply.toString()),
      totalBorrow: Decimal128(totalBorrow.toString()),
      totalReserves: Decimal128(totalReserves.toString()),
      lastPrice: Decimal128(lastPrice),
      exchangeRate: Decimal128(exchangeRate.toString()),
      supplyRate: Decimal128(supplyApy.toString()),
      borrowRate: Decimal128(borrowApy.toString()),
      liquidity: Decimal128(liquidity.toString()),
    };
  }

  async onModuleInit() {
    const supportMarkets = Object.values(SUPPORT_MARKET);
    if (supportMarkets && supportMarkets.length > 0) {
      for (const oToken of supportMarkets) {
        if (oToken == '') continue;
        const assetInfo = await this.getAssetInfoFromBlockchain(oToken);
        await this.assetRepository.getTokenModel().findOneAndUpdate(
          {
            oTokenAddress: { $regex: oToken, $options: 'i' },
          },
          {
            $set: { ...assetInfo },
          },
          { upsert: true },
        );
      }
    }
  }

  async assetsList(): Promise<Token[]> {
    return await this.assetRepository.find({ sort: { name: 1 } });
  }
}
