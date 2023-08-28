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

export enum INCENTIVE_EVENT {
  TRANSFER = 'Transfer',
  CLAIM_REWARD = 'ClaimRewardIncentive',
}

export enum NFT_EVENT {
  TRANSFER = 'Transfer',
  MINT = 'MintNft',
}

export enum STAKING_NFT_EVENT {
  STAKING = 'NftStaked',
  UNSTAKING = 'NftUnstaked',
  CLAIM_REWARD = 'ClaimedRewards',
}

export enum LP_EVENT {
  STAKING = 'Staked',
  UNSTAKING = 'Unstaked',
  CLAIM_REWARD = 'Claimed',
  CLAIM_LP_TOKEN = 'ClaimedLpTokens',
  UNSTAKE_REQUEST = 'UnstakeRequested',
}

export enum AVAILABLE_EVENT {
  USER_CREATE_UPDATE = 'UserCreateUpdate',
}
