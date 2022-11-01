import {
  contracts as MoonbaseContracts,
  defaultMarket as MoonbaseDefaultMarket,
  supportMarkets as MoonbaseSupportMarket,
  tokens as MoonbaseTokens,
} from '@app/core/contracts/moonbase.json';
import {
  contracts as MoonriverContracts,
  defaultMarket as MoonriverDefaultMarket,
  supportMarkets as MoonriverSupportMarket,
  tokens as MoonriverTokens,
} from '@app/core/contracts/moonriver.json';
import {
  contracts as MoonbeamContracts,
  defaultMarket as MoonbeamDefaultMarket,
  supportMarkets as MoonbeamSupportMarket,
  tokens as MoonbeamTokens,
} from '@app/core/contracts/moonbeam.json';

const { NODE_TYPE } = process.env;

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

export {
  ethMantissa,
  blocksPerDay,
  daysPerYear,
  COMPTROLLER,
  DEFAULT_TOKEN,
  SUPPORT_MARKET,
  TOKENS,
  NODE_TYPE,
};
