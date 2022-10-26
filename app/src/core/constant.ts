import {
  Comptroller as TestnetComptroller,
  oMOVR as TestnetDefaultToken,
} from '@app/core/contracts/testnet.json';
import {
  Comptroller as MainnetComptroller,
  oMOVR as MainnetDefaultToken,
} from '@app/core/contracts/mainnet.json';

const { NODE_TYPE } = process.env;

const ethMantissa = 1e18;
const blocksPerDay = 7200; // 15 seconds per block
const daysPerYear = 365;

const COMPTROLLER =
  NODE_TYPE == 'testnet' ? TestnetComptroller : MainnetComptroller;

const DEFAULT_TOKEN =
  NODE_TYPE == 'testnet' ? TestnetDefaultToken : MainnetDefaultToken;

export { ethMantissa, blocksPerDay, daysPerYear, COMPTROLLER, DEFAULT_TOKEN };
