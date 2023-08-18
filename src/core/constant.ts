import {
  supportNetworks as MoonbaseSupportNetworks,
  contracts as MoonbaseContracts,
  defaultMarket as MoonbaseDefaultMarket,
  supportMarkets as MoonbaseSupportMarket,
  tokens as MoonbaseTokens,
  settings as MoonbaseSettings,
} from '@app/core/contracts/moonbase.json';
import {
  supportNetworks as MoonriverSupportNetworks,
  contracts as MoonriverContracts,
  defaultMarket as MoonriverDefaultMarket,
  supportMarkets as MoonriverSupportMarket,
  tokens as MoonriverTokens,
  settings as MoonriverSettings,
} from '@app/core/contracts/moonriver.json';
import {
  supportNetworks as MoonbeamSupportNetworks,
  contracts as MoonbeamContracts,
  defaultMarket as MoonbeamDefaultMarket,
  supportMarkets as MoonbeamSupportMarket,
  tokens as MoonbeamTokens,
  settings as MoonbeamSettings,
} from '@app/core/contracts/moonbeam.json';

const {
  NODE_TYPE,
  NODE_TYPE_LOTTERY,
  PRICE_FEED_OWNER_KEY,
  LOTTERY_OPERATOR_KEY,
  CRON_LOTTERY,
  CRON_LOTTERY_TIME,
  LOTTERY_TICKET_PRICE_ORB,
  PRICE_FEED_UPDATE,
} = process.env;

const ethMantissa = 1e18;
const blocksPerDay = 7200; // 15 seconds per block
const daysPerYear = 365;

const distributionPrizePercent = {
  1: 2,
  2: 3,
  3: 5,
  4: 10,
  5: 20,
  6: 40,
};

const burnPool = 20;

const COMPTROLLER =
  NODE_TYPE == 'moonbase'
    ? MoonbaseContracts.Comptroller
    : NODE_TYPE == 'moonriver'
    ? MoonriverContracts.Comptroller
    : MoonbeamContracts.Comptroller;

const LOTTERY =
  NODE_TYPE_LOTTERY == 'moonbase'
    ? MoonbaseContracts.Lottery
    : NODE_TYPE_LOTTERY == 'moonriver'
    ? MoonriverContracts.Lottery
    : MoonbeamContracts.Lottery;

const READER =
  NODE_TYPE == 'moonbase'
    ? MoonbaseContracts.Reader
    : NODE_TYPE == 'moonriver'
    ? MoonriverContracts.Reader
    : MoonbeamContracts.Reader;

const INCENTIVE =
  NODE_TYPE == 'moonbase'
    ? MoonbaseContracts.Incentive
    : NODE_TYPE == 'moonriver'
    ? MoonriverContracts.Incentive
    : MoonbeamContracts.Incentive;

const NFT =
  NODE_TYPE == 'moonbase'
    ? MoonbaseContracts.NFT
    : NODE_TYPE == 'moonriver'
    ? MoonriverContracts.NFT
    : MoonbeamContracts.NFT;

const STAKING =
  NODE_TYPE == 'moonbase'
    ? MoonbaseContracts.Staking
    : NODE_TYPE == 'moonriver'
    ? MoonriverContracts.Staking
    : MoonbeamContracts.Staking;

const LP =
  NODE_TYPE == 'moonbase'
    ? MoonbaseContracts.LP
    : NODE_TYPE == 'moonriver'
    ? MoonriverContracts.LP
    : MoonbeamContracts.LP;

const SUPPORT_NETWORKS =
  NODE_TYPE == 'moonbase'
    ? MoonbaseSupportNetworks
    : NODE_TYPE == 'moonriver'
    ? MoonriverSupportNetworks
    : MoonbeamSupportNetworks;

const DEFAULT_TOKEN =
  NODE_TYPE == 'moonbase'
    ? MoonbaseDefaultMarket
    : NODE_TYPE == 'moonriver'
    ? MoonriverDefaultMarket
    : MoonbeamDefaultMarket;

const SUPPORT_MARKET =
  NODE_TYPE == 'moonbase'
    ? MoonbaseSupportMarket
    : NODE_TYPE == 'moonriver'
    ? MoonriverSupportMarket
    : MoonbeamSupportMarket;

const TOKENS =
  NODE_TYPE == 'moonbase'
    ? MoonbaseTokens
    : NODE_TYPE == 'moonriver'
    ? MoonriverTokens
    : MoonbeamTokens;

const SETTINGS =
  NODE_TYPE == 'moonbase'
    ? MoonbaseSettings
    : NODE_TYPE == 'moonriver'
    ? MoonriverSettings
    : MoonbeamSettings;

const LOTTERY_SETTING = {
  discount: 1920,
  rewards: [250, 375, 625, 1250, 2500, 5000],
  treasury: 2000,
};

export {
  ethMantissa,
  blocksPerDay,
  daysPerYear,
  COMPTROLLER,
  LOTTERY,
  READER,
  INCENTIVE,
  DEFAULT_TOKEN,
  SUPPORT_MARKET,
  SUPPORT_NETWORKS,
  TOKENS,
  NODE_TYPE,
  SETTINGS,
  PRICE_FEED_OWNER_KEY,
  distributionPrizePercent,
  burnPool,
  LOTTERY_SETTING,
  LOTTERY_OPERATOR_KEY,
  CRON_LOTTERY,
  CRON_LOTTERY_TIME,
  LOTTERY_TICKET_PRICE_ORB,
  PRICE_FEED_UPDATE,
  NFT,
  STAKING,
  LP,
};
