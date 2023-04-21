export enum TOKEN_EVENT {
  APPROVAL = 'Approval',
  TRANSFER = 'Transfer',
}

export enum MARKET_TOKEN_EVENT {
  MINT = 'Mint',
  REDEEM = 'Redeem',
  BORROW = 'Borrow',
  REPAY_BORROW = 'RepayBorrow',
  LIQUIDATE_BORROW = 'LiquidateBorrow',
  TRANSFER = 'Transfer',
  APPROVAL = 'Approval',
}

export enum FAIL_EVENT {
  FAILURE = 'Failure',
}

export enum CONTROLLER_EVENT {
  MARKET_LISTED = 'MarketListed',
  MARKET_ENTERED = 'MarketEntered',
  MARKET_EXITED = 'MarketExited',
  ACTION_PAUSED = 'ActionPaused',
}

export enum LOTTERY_EVENT {
  LOTTERY_OPEN = 'LotteryOpen',
  LOTTERY_CLOSE = 'LotteryClose',
  LOTTERY_DRAWN = 'LotteryNumberDrawn',
  LOTTERY_TICKETS_PURCHASE = 'TicketsPurchase',
}

export enum AVAILABLE_EVENT {
  USER_CREATE_UPDATE = 'UserCreateUpdate',
}
