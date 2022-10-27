import { Injectable, OnModuleInit } from '@nestjs/common';
import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import { Contract } from 'web3-eth-contract';

import {
  comptrollerAbi,
  cErcAbi,
  cEthAbi,
  erc20Abi,
  priceFeedAbi,
} from '@app/core/abi/contracts.json';
import { Web3Service } from '@app/core/web3/web3.service';
import { AssetRepository } from './asset.repository';
import { Decimal128 } from '@app/core/schemas/user.schema';
import {
  blocksPerDay,
  COMPTROLLER,
  daysPerYear,
  DEFAULT_TOKEN,
  ethMantissa,
  SUPPORT_MARKET,
} from '@app/core/constant';
import { Token } from '@app/core/schemas/token.schema';

const web3 = new Web3();

const { NODE_TYPE } = process.env;

@Injectable()
export class AssetService implements OnModuleInit {
  constructor(
    private readonly web3Service: Web3Service,
    private readonly assetRepository: AssetRepository,
  ) {}

  private async getAssetInfoFromBlockchain(
    oToken: string,
    comptroller: Contract,
    oracle: Contract,
  ) {
    const client = this.web3Service.getClient(NODE_TYPE);
    const contractOToken = this.web3Service.getContract(
      NODE_TYPE,
      oToken,
      oToken.toLowerCase() === DEFAULT_TOKEN.toLowerCase() ? cEthAbi : cErcAbi,
    );
    let underlying: string = null;
    if (oToken.toLowerCase() !== DEFAULT_TOKEN.toLowerCase()) {
      underlying = await contractOToken.methods.underlying().call();
    }
    const tokenData = {
      name: ['moonriver', 'moonbase'].includes(NODE_TYPE)
        ? 'Moonriver'
        : 'Moonbeam',
      symbol: ['moonriver', 'moonbase'].includes(NODE_TYPE) ? 'MOVR' : 'GLMR',
      tokenDecimal: 18,
    };
    let erc20Token = null;
    if (underlying) {
      erc20Token = this.web3Service.getContract(
        NODE_TYPE,
        underlying,
        erc20Abi,
      );
      tokenData.name = await erc20Token.methods.name().call();
      tokenData.symbol = await erc20Token.methods.symbol().call();
      tokenData.tokenDecimal = +(await erc20Token.methods.decimals().call());
    }
    const { 1: collateralFactorMantissa } = await comptroller.methods
      .markets(oToken)
      .call();

    const totalSupply = new BigNumber(
      await contractOToken.methods.totalSupply().call(),
    ).div(Math.pow(10, tokenData.tokenDecimal));
    const totalBorrow = new BigNumber(
      await contractOToken.methods.totalBorrows().call(),
    ).div(Math.pow(10, tokenData.tokenDecimal));
    const totalReserves = new BigNumber(
      await contractOToken.methods.totalReserves().call(),
    ).div(Math.pow(10, tokenData.tokenDecimal));
    const lastPrice = web3.utils.fromWei(
      `${await oracle.methods.getUnderlyingPrice(oToken).call()}`,
      'ether',
    );
    const exchangeRate = new BigNumber(
      await contractOToken.methods.exchangeRateCurrent().call(),
    ).div(Math.pow(10, 18 + tokenData.tokenDecimal - 8));
    const supplyRatePerBlock = await contractOToken.methods
      .supplyRatePerBlock()
      .call();
    const borrowRatePerBlock = await contractOToken.methods
      .borrowRatePerBlock()
      .call();
    const supplyApy =
      (Math.pow(
        (supplyRatePerBlock / ethMantissa) * blocksPerDay + 1,
        daysPerYear,
      ) -
        1) *
      100;
    const borrowApy =
      (Math.pow(
        (borrowRatePerBlock / ethMantissa) * blocksPerDay + 1,
        daysPerYear,
      ) -
        1) *
      100;
    let liquidity = new BigNumber(0);
    if (!underlying) {
      liquidity = new BigNumber(
        `${client.utils.fromWei(await client.eth.getBalance(oToken), 'ether')}`,
      );
    } else {
      liquidity = new BigNumber(
        await erc20Token.methods.balanceOf(oToken).call(),
      ).div(Math.pow(10, tokenData.tokenDecimal));
    }

    return {
      oTokenAddress: oToken,
      oTokenDecimal: +(await contractOToken.methods.decimals().call()),
      tokenAddress: underlying || '',
      ...tokenData,
      typeNetwork: NODE_TYPE,
      collateralFactor:
        +web3.utils.fromWei(`${collateralFactorMantissa}`, 'ether') * 100,
      reserveFactor:
        +web3.utils.fromWei(
          `${await contractOToken.methods.reserveFactorMantissa().call()}`,
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
    return;
    const comptroller = this.web3Service.getContract(
      NODE_TYPE,
      COMPTROLLER,
      comptrollerAbi,
    );

    const oracle = this.web3Service.getContract(
      NODE_TYPE,
      await comptroller.methods.oracle().call(),
      priceFeedAbi,
    );

    const supportMarkets = Object.values(SUPPORT_MARKET);
    if (supportMarkets && supportMarkets.length > 0) {
      for (const oToken of supportMarkets) {
        if (oToken == '') continue;
        const assetInfo = await this.getAssetInfoFromBlockchain(
          oToken,
          comptroller,
          oracle,
        );
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
