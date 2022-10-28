export enum TOKEN_EVENT {
  Approval = 'Approval',
  Transfer = 'Transfer',
}

export enum MARKET_TOKEN_EVENT {
  Mint = 'Mint',
  Redeem = 'Redeem',
  Borrow = 'Borrow',
  RepayBorrow = 'RepayBorrow',
  LiquidateBorrow = 'LiquidateBorrow',
  Transfer = 'Transfer',
  Approval = 'Approval',
}

export enum CONTROLLER_EVENT {
  MarketListed = 'MarketListed',
  MarketEntered = 'MarketEntered',
  MarketExited = 'MarketExited',
}
