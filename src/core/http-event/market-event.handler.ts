import { Injectable, OnModuleInit } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { Log } from 'web3-core';

import { MARKET_TOKEN_EVENT } from '../event/interfaces/event.interface';
import { Decimal128 } from '../schemas/user.schema';
import { HttpEventAbstractService } from './http-event.abstract.service';
import { HttpEventListener } from './interfaces/http-event.interface';

const { NODE_TYPE: typeNetwork, DISCORD_WEBHOOK_ORBITER } = process.env;

@Injectable()
export class MarketEventHandler
  extends HttpEventAbstractService
  implements OnModuleInit
{
  private topics = {
    [`${this.web3.utils.sha3('Mint(address,uint256,uint256)')}`]:
      MARKET_TOKEN_EVENT.MINT,
    [`${this.web3.utils.sha3('Borrow(address,uint256,uint256,uint256)')}`]:
      MARKET_TOKEN_EVENT.BORROW,
    [`${this.web3.utils.sha3(
      'RepayBorrow(address,address,uint256,uint256,uint256)',
    )}`]: MARKET_TOKEN_EVENT.REPAY_BORROW,
    [`${this.web3.utils.sha3('Redeem(address,uint256,uint256)')}`]:
      MARKET_TOKEN_EVENT.REDEEM,
    [`${this.web3.utils.sha3('Transfer(address,address,uint256)')}`]:
      MARKET_TOKEN_EVENT.TRANSFER,
  };

  async onModuleInit() {
    const { supportMarkets: markets } = this.contracts;
    setTimeout(() => {
      for (const token of Object.values(markets)) {
        this.eventEmitter.emit(HttpEventListener.ADD_LISTEN, {
          contractAddress: token,
          eventHandlerCallback: (events: Log[]) => this.handleEvents(events),
        });
      }
    }, 5000);
  }

  private async handleEvents(events: Log[]): Promise<void> {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const { transactionHash: txHash, topics, address: token } = event;
      const checkEvent = this.topics[topics[0]];
      if (checkEvent) {
        let returnValues = null;
        switch (checkEvent) {
          case MARKET_TOKEN_EVENT.MINT:
            returnValues = this.web3.eth.abi.decodeLog(
              [
                {
                  indexed: false,
                  internalType: 'address',
                  name: 'minter',
                  type: 'address',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'mintAmount',
                  type: 'uint256',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'mintTokens',
                  type: 'uint256',
                },
              ],
              event.data,
              [],
            );
            await this.handleMintEvent({
              ...returnValues,
              token,
              event: checkEvent,
              txHash,
            } as any);
            break;
          case MARKET_TOKEN_EVENT.BORROW:
            returnValues = this.web3.eth.abi.decodeLog(
              [
                {
                  indexed: false,
                  internalType: 'address',
                  name: 'borrower',
                  type: 'address',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'borrowAmount',
                  type: 'uint256',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'accountBorrows',
                  type: 'uint256',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'totalBorrows',
                  type: 'uint256',
                },
              ],
              event.data,
              [],
            );
            await this.handleBorrowEvent({
              ...returnValues,
              token,
              event: checkEvent,
              txHash,
            } as any);
            break;
          case MARKET_TOKEN_EVENT.REPAY_BORROW:
            returnValues = this.web3.eth.abi.decodeLog(
              [
                {
                  indexed: false,
                  internalType: 'address',
                  name: 'payer',
                  type: 'address',
                },
                {
                  indexed: false,
                  internalType: 'address',
                  name: 'borrower',
                  type: 'address',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'repayAmount',
                  type: 'uint256',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'accountBorrows',
                  type: 'uint256',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'totalBorrows',
                  type: 'uint256',
                },
              ],
              event.data,
              [],
            );
            await this.handleRepayBorrowEvent({
              ...returnValues,
              token,
              event: checkEvent,
              txHash,
            } as any);
            break;
          case MARKET_TOKEN_EVENT.REDEEM:
            returnValues = this.web3.eth.abi.decodeLog(
              [
                {
                  indexed: false,
                  internalType: 'address',
                  name: 'redeemer',
                  type: 'address',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'redeemAmount',
                  type: 'uint256',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'redeemTokens',
                  type: 'uint256',
                },
              ],
              event.data,
              [],
            );
            await this.handleRedeemEvent({
              ...returnValues,
              token,
              event: checkEvent,
              txHash,
            } as any);
            break;
          case MARKET_TOKEN_EVENT.TRANSFER:
            returnValues = this.web3.eth.abi.decodeLog(
              [
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'from',
                  type: 'address',
                },
                {
                  indexed: true,
                  internalType: 'address',
                  name: 'to',
                  type: 'address',
                },
                {
                  indexed: false,
                  internalType: 'uint256',
                  name: 'amount',
                  type: 'uint256',
                },
              ],
              event.data,
              [topics[1], topics[2]],
            );
            await this.handleTransferEvent({
              ...returnValues,
              token,
              event: checkEvent,
              txHash,
            } as any);
            break;
          case MARKET_TOKEN_EVENT.LIQUIDATE_BORROW:
            break;
        }
      }
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
              typeNetwork,
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
          typeNetwork,
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
          `:white_check_mark: Wallet address: ${minter}\nType: Supply\nAsset name: ${
            checkToken.name
          }\nAmount: ${new BigNumber(mintAmount)
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
              typeNetwork,
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
        typeNetwork,
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
        `:white_check_mark: Wallet address: ${borrower}\nType: Borrow\nAsset name: ${
          checkToken.name
        }\nAmount: ${new BigNumber(borrowAmount)
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
              typeNetwork,
            },
          },
          { upsert: true },
        );

      await this.transactionService.transactionRepository.transactionCreate({
        token: checkToken._id,
        user: checkUser._id,
        event,
        status: true,
        typeNetwork,
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
              typeNetwork,
            },
          },
          { upsert: true },
        );

      await this.transactionService.transactionRepository.transactionCreate({
        token: checkToken._id,
        user: checkUser._id,
        event,
        status: true,
        typeNetwork,
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
