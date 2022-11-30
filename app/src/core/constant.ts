import {
  contracts as MoonbaseContracts,
  defaultMarket as MoonbaseDefaultMarket,
  supportMarkets as MoonbaseSupportMarket,
  tokens as MoonbaseTokens,
  settings as MoonbaseSettings,
} from '@app/core/contracts/moonbase.json';
import {
  contracts as MoonriverContracts,
  defaultMarket as MoonriverDefaultMarket,
  supportMarkets as MoonriverSupportMarket,
  tokens as MoonriverTokens,
  settings as MoonriverSettings,
} from '@app/core/contracts/moonriver.json';
import {
  contracts as MoonbeamContracts,
  defaultMarket as MoonbeamDefaultMarket,
  supportMarkets as MoonbeamSupportMarket,
  tokens as MoonbeamTokens,
  settings as MoonbeamSettings,
} from '@app/core/contracts/moonbeam.json';

const { NODE_TYPE, PRICE_FEED_OWNER_KEY } = process.env;

const ethMantissa = 1e18;
const blocksPerDay = 7200; // 15 seconds per block
const daysPerYear = 365;

const COMPTROLLER =
  NODE_TYPE == 'moonbase'
    ? MoonbaseContracts.Comptroller
    : NODE_TYPE == 'moonriver'
    ? MoonriverContracts.Comptroller
    : MoonbeamContracts.Comptroller;

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

export {
  ethMantissa,
  blocksPerDay,
  daysPerYear,
  COMPTROLLER,
  DEFAULT_TOKEN,
  SUPPORT_MARKET,
  TOKENS,
  NODE_TYPE,
  SETTINGS,
  PRICE_FEED_OWNER_KEY,
};
