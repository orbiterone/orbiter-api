import { Injectable } from '@nestjs/common';
import { Timeout } from '@nestjs/schedule';
import { BigNumber } from 'bignumber.js';

import { NODE_TYPE } from '../constant';
import { Decimal128 } from '../schemas/user.schema';
import { EventService } from './event.service';
import { MARKET_TOKEN_EVENT } from './interfaces/event.interface';

BigNumber.config({ EXPONENTIAL_AT: [-100, 100] });

const { DISCORD_WEBHOOK_ORBITER } = process.env;

@Injectable()
export class MarketEvent extends EventService {
  // @Timeout(5000)
  async addListenContract() {
    const { supportMarkets: markets } = this.contracts;

    for (const token of Object.values(markets)) {
      const contract = this.oTokenCore.contract(token, true);
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
              await this.handleRedeemEvent({
                ...returnValues,
                token,
                event: event.event,
                txHash,
              });
              break;
            case MARKET_TOKEN_EVENT.TRANSFER:
              await this.handleTransferEvent({
                ...returnValues,
                token,
                event: event.event,
                txHash,
              });
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
        await this.oTokenCore.balanceOf(token, minter),
      ).div(new BigNumber(10).pow(checkToken.oTokenDecimal));
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

      if (event == MARKET_TOKEN_EVENT.MINT) {
        await this.transactionService.transactionRepository.transactionCreate({
          token: checkToken._id,
          user: checkUser._id,
          event,
          status: true,
          typeNetwork: NODE_TYPE,
          txHash,
          data: {
            user: minter,
            amount: Decimal128(
              new BigNumber(mintAmount)
                .div(new BigNumber(10).pow(checkToken.tokenDecimal))
                .toString(),
            ),
            mintTokens: Decimal128(
              new BigNumber(mintTokens)
                .div(new BigNumber(10).pow(checkToken.oTokenDecimal))
                .toString(),
            ),
          },
        });
        await this.assetService.updateAssetInfo(token);

        await this.discordService.sendNotification(
          DISCORD_WEBHOOK_ORBITER,
          `1. Wallet address: ${minter}\n 2. Type: Supply\n 3. Asset: ${
            checkToken.symbol
          }\n 4. Amount: ${new BigNumber(mintAmount)
            .div(new BigNumber(10).pow(checkToken.tokenDecimal))
            .toString()}`,
        );
      }
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
        await this.oTokenCore.borrowBalanceCurrent(token, borrower),
      ).div(new BigNumber(10).pow(checkToken.tokenDecimal));
      const checkEnteredAsset =
        await this.controllerOrbiterCore.checkMembership(borrower, token);
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
              collateral: checkEnteredAsset,
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
          user: borrower,
          amount: Decimal128(
            new BigNumber(borrowAmount)
              .div(new BigNumber(10).pow(checkToken.tokenDecimal))
              .toString(),
          ),
          accountBorrows: Decimal128(
            new BigNumber(accountBorrows)
              .div(new BigNumber(10).pow(checkToken.tokenDecimal))
              .toString(),
          ),
          totalBorrows: Decimal128(
            new BigNumber(totalBorrows)
              .div(new BigNumber(10).pow(checkToken.tokenDecimal))
              .toString(),
          ),
        },
      });
      await this.assetService.updateAssetInfo(token);

      await this.discordService.sendNotification(
        DISCORD_WEBHOOK_ORBITER,
        `1. Wallet address: ${borrower}\n 2. Type: Borrow\n 3. Asset: ${
          checkToken.symbol
        }\n 4. Amount: ${new BigNumber(borrowAmount)
          .div(new BigNumber(10).pow(checkToken.tokenDecimal))
          .toString()}`,
      );
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
        new BigNumber(10).pow(checkToken.tokenDecimal),
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
          user: payer,
          amount: Decimal128(
            new BigNumber(repayAmount)
              .div(new BigNumber(10).pow(checkToken.tokenDecimal))
              .toString(),
          ),
          accountBorrows: Decimal128(
            new BigNumber(accountBorrows)
              .div(new BigNumber(10).pow(checkToken.tokenDecimal))
              .toString(),
          ),
          totalBorrows: Decimal128(
            new BigNumber(totalBorrows)
              .div(new BigNumber(10).pow(checkToken.tokenDecimal))
              .toString(),
          ),
        },
      });
      await this.assetService.updateAssetInfo(token);
    }
  }

  private async handleRedeemEvent({
    redeemer,
    redeemAmount,
    redeemTokens,
    token,
    event,
    txHash,
  }) {
    const checkUser = await this.userService.createUpdateGetUser(redeemer);
    const checkToken = await this.assetService.assetRepository
      .getTokenModel()
      .findOne({ oTokenAddress: { $regex: token, $options: 'i' } });
    if (checkToken) {
      const totalSupply = new BigNumber(
        await this.oTokenCore.balanceOf(token, redeemer),
      ).div(new BigNumber(10).pow(checkToken.oTokenDecimal));
      if (totalSupply.eq(0) && checkToken.suppliers.includes(redeemer)) {
        checkToken.suppliers = checkToken.suppliers.filter(
          (el) => el.toLowerCase() != redeemer.toLowerCase(),
        );
        await checkToken.save();
      }
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
          user: redeemer,
          amount: Decimal128(
            new BigNumber(redeemAmount)
              .div(new BigNumber(10).pow(checkToken.tokenDecimal))
              .toString(),
          ),
          redeemTokens: Decimal128(
            new BigNumber(redeemTokens)
              .div(new BigNumber(10).pow(checkToken.oTokenDecimal))
              .toString(),
          ),
        },
      });
      await this.assetService.updateAssetInfo(token);
    }
  }

  private async handleTransferEvent({
    from,
    to,
    amount,
    token,
    event,
    txHash,
  }) {
    const checkFrom = this.web3Service.getClient().utils.isAddress(from);
    const checkTo = this.web3Service.getClient().utils.isAddress(to);
    if (checkFrom && checkTo && from.toLowerCase() != token.toLowerCase()) {
      await this.handleMintEvent({
        token,
        minter: from,
        mintTokens: amount,
        mintAmount: 0,
        event,
        txHash,
      });

      await this.assetService.wait(5000);

      await this.handleMintEvent({
        token,
        minter: to,
        mintTokens: amount,
        mintAmount: 0,
        event,
        txHash,
      });
    }
  }
}
