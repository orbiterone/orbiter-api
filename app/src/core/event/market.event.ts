import { Injectable } from '@nestjs/common';
import { Timeout } from '@nestjs/schedule';
import BigNumber from 'bignumber.js';
import { NODE_TYPE } from '../constant';
import { Decimal128 } from '../schemas/user.schema';

import { EventService } from './event.service';
import { MARKET_TOKEN_EVENT } from './interfaces/event.interface';

@Injectable()
export class MarketEvent extends EventService {
  @Timeout(5000)
  async addListenContract() {
    const { supportMarkets: markets } = this.contracts;

    for (const token of Object.values(markets)) {
      const contract = this.oTokenCore.setToken(token).contract(true);
      contract.events
        .allEvents()
        .on('connected', function (subscriptionId) {
          console.log(
            `oToken - ${token} successfully connected.`,
            subscriptionId,
          );
        })
        .on('data', async (event) => {
          const { returnValues, transactionHash: txHash } = event;
          console.log(event);
          switch (event.event) {
            case MARKET_TOKEN_EVENT.MINT:
              await this.handleMintEvent({
                ...returnValues,
                token,
                event: event.event,
                txHash,
              });
              break;
            case MARKET_TOKEN_EVENT.BORROW:
              await this.handleBorrowEvent({
                ...returnValues,
                token,
                event: event.event,
                txHash,
              });
              break;
            case MARKET_TOKEN_EVENT.REPAY_BORROW:
              await this.handleRepayBorrowEvent({
                ...returnValues,
                token,
                event: event.event,
                txHash,
              });
              break;
            case MARKET_TOKEN_EVENT.REDEEM:
              break;

            case MARKET_TOKEN_EVENT.LIQUIDATE_BORROW:
              break;
          }
        })
        .on('error', function (error, receipt) {
          console.log(error, receipt);
        });
    }
  }

  private async handleMintEvent({
    token,
    minter,
    mintAmount,
    mintTokens,
    event,
    txHash,
  }) {
    const checkUser = await this.userService.createUpdateGetUser(minter);
    const checkToken = await this.assetService.assetRepository
      .getTokenModel()
      .findOne({ oTokenAddress: { $regex: token, $options: 'i' } });
    if (checkToken) {
      if (!checkToken.suppliers.includes(minter)) {
        checkToken.suppliers.push(minter);
        await checkToken.save();
      }
      const totalSupply = new BigNumber(
        await this.oTokenCore.setToken(token).balanceOfUnderlying(minter),
      ).div(Math.pow(10, checkToken.tokenDecimal));
      await this.userService.userRepository
        .getUserTokenModel()
        .findOneAndUpdate(
          {
            user: checkUser._id,
            token: checkToken._id,
          },
          {
            $set: {
              user: checkUser._id,
              token: checkToken._id,
              totalSupply: Decimal128(totalSupply.toString()),
              typeNetwork: NODE_TYPE,
            },
          },
          { upsert: true },
        );

      await this.transactionService.transactionRepository.transactionCreate({
        token: checkToken._id,
        user: checkUser._id,
        event,
        status: true,
        typeNetwork: NODE_TYPE,
        txHash,
        data: {
          minter,
          mintAmount: new BigNumber(mintAmount)
            .dividedBy(Math.pow(10, checkToken.tokenDecimal))
            .toString(),
          mintTokens: new BigNumber(mintTokens)
            .dividedBy(Math.pow(10, checkToken.oTokenDecimal))
            .toString(),
        },
      });
      await this.assetService.updateAssetInfo(token);
    }
  }

  private async handleBorrowEvent({
    borrower,
    borrowAmount,
    accountBorrows,
    totalBorrows,
    token,
    event,
    txHash,
  }) {
    const checkUser = await this.userService.createUpdateGetUser(borrower);
    const checkToken = await this.assetService.assetRepository
      .getTokenModel()
      .findOne({ oTokenAddress: { $regex: token, $options: 'i' } });
    if (checkToken) {
      if (!checkToken.borrowers.includes(borrower)) {
        checkToken.borrowers.push(borrower);
        await checkToken.save();
      }
      const totalBorrow = new BigNumber(
        await this.oTokenCore.setToken(token).borrowBalanceCurrent(borrower),
      ).div(Math.pow(10, checkToken.tokenDecimal));
      await this.userService.userRepository
        .getUserTokenModel()
        .findOneAndUpdate(
          {
            user: checkUser._id,
            token: checkToken._id,
          },
          {
            $set: {
              user: checkUser._id,
              token: checkToken._id,
              totalBorrow: Decimal128(totalBorrow.toString()),
              typeNetwork: NODE_TYPE,
            },
          },
          { upsert: true },
        );

      await this.transactionService.transactionRepository.transactionCreate({
        token: checkToken._id,
        user: checkUser._id,
        event,
        status: true,
        typeNetwork: NODE_TYPE,
        txHash,
        data: {
          borrower,
          borrowAmount: new BigNumber(borrowAmount)
            .dividedBy(Math.pow(10, checkToken.tokenDecimal))
            .toString(),
          accountBorrows: new BigNumber(accountBorrows)
            .dividedBy(Math.pow(10, checkToken.tokenDecimal))
            .toString(),
          totalBorrows: new BigNumber(totalBorrows)
            .dividedBy(Math.pow(10, checkToken.tokenDecimal))
            .toString(),
        },
      });
      await this.assetService.updateAssetInfo(token);
    }
  }

  private async handleRepayBorrowEvent({
    payer,
    borrower,
    repayAmount,
    accountBorrows,
    totalBorrows,
    token,
    event,
    txHash,
  }) {
    const checkUser = await this.userService.createUpdateGetUser(borrower);
    const checkToken = await this.assetService.assetRepository
      .getTokenModel()
      .findOne({ oTokenAddress: { $regex: token, $options: 'i' } });
    if (checkToken) {
      if (accountBorrows == 0 && checkToken.borrowers.includes(borrower)) {
        checkToken.borrowers = checkToken.borrowers.filter(
          (el) => el.toLowerCase() != borrower.toLowerCase(),
        );
        await checkToken.save();
      }
      const totalBorrow = new BigNumber(accountBorrows).div(
        Math.pow(10, checkToken.tokenDecimal),
      );
      await this.userService.userRepository
        .getUserTokenModel()
        .findOneAndUpdate(
          {
            user: checkUser._id,
            token: checkToken._id,
          },
          {
            $set: {
              user: checkUser._id,
              token: checkToken._id,
              totalBorrow: Decimal128(totalBorrow.toString()),
              typeNetwork: NODE_TYPE,
            },
          },
          { upsert: true },
        );

      await this.transactionService.transactionRepository.transactionCreate({
        token: checkToken._id,
        user: checkUser._id,
        event,
        status: true,
        typeNetwork: NODE_TYPE,
        txHash,
        data: {
          payer,
          borrower,
          repayAmount: new BigNumber(repayAmount)
            .dividedBy(Math.pow(10, checkToken.tokenDecimal))
            .toString(),
          accountBorrows: new BigNumber(accountBorrows)
            .dividedBy(Math.pow(10, checkToken.tokenDecimal))
            .toString(),
          totalBorrows: new BigNumber(totalBorrows)
            .dividedBy(Math.pow(10, checkToken.tokenDecimal))
            .toString(),
        },
      });
      await this.assetService.updateAssetInfo(token);
    }
  }
}
