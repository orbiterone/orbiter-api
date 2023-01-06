import { Token } from '@app/core/schemas/token.schema';
import { ApiProperty } from '@nestjs/swagger';

export class AssetInfoResponse {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  symbol: string;

  @ApiProperty()
  oTokenDecimal: number;

  @ApiProperty()
  tokenDecimal: number;

  @ApiProperty()
  oTokenAddress: string;

  @ApiProperty()
  tokenAddress: string;

  @ApiProperty()
  typeNetwork: string;

  @ApiProperty()
  collateralFactor: number;

  @ApiProperty()
  reserveFactor: number;

  @ApiProperty()
  exchangeRate: string;

  @ApiProperty()
  supplyRate: string;

  @ApiProperty()
  borrowRate: string;

  @ApiProperty()
  totalSupply: string;

  @ApiProperty()
  totalBorrow: string;

  @ApiProperty()
  totalReserves: string;

  @ApiProperty()
  lastPrice: string;

  @ApiProperty()
  liquidity: string;

  @ApiProperty()
  image: string;

  @ApiProperty()
  color: string;

  @ApiProperty()
  countSuppliers: number;

  @ApiProperty()
  countBorrowers: number;

  @ApiProperty()
  utilization: number;

  @ApiProperty()
  supplyPaused: boolean;

  @ApiProperty()
  borrowPaused: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

class AssetInfo {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  symbol: string;

  @ApiProperty()
  image: string;

  @ApiProperty()
  apy: string;

  @ApiProperty()
  tokenDecimal: number;

  @ApiProperty()
  oTokenAddress: string;

  @ApiProperty()
  tokenAddress: string;
}

class AssetCompositionInfo {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  symbol: string;

  @ApiProperty()
  image: string;

  @ApiProperty()
  color: string;
}

export class SupplyBorrowInfoByAssetAccount {
  @ApiProperty({ type: AssetInfo })
  token: AssetInfo;

  @ApiProperty()
  collateral: boolean;

  @ApiProperty()
  value: string;
}

export class AssetByAccountResponse {
  @ApiProperty({ type: [SupplyBorrowInfoByAssetAccount] })
  supplied: SupplyBorrowInfoByAssetAccount[];

  @ApiProperty({ type: [SupplyBorrowInfoByAssetAccount] })
  borrowed: SupplyBorrowInfoByAssetAccount[];
}

class SupplyBorrowInfoCompositionByAssetAccount {
  @ApiProperty({ type: AssetCompositionInfo })
  token: AssetCompositionInfo;

  @ApiProperty()
  percent: string;
}

export class AssetCompositionByAccountResponse {
  @ApiProperty({ type: [SupplyBorrowInfoCompositionByAssetAccount] })
  supplied: SupplyBorrowInfoCompositionByAssetAccount[];

  @ApiProperty({ type: [SupplyBorrowInfoCompositionByAssetAccount] })
  borrowed: SupplyBorrowInfoCompositionByAssetAccount[];
}

export class AssetBalanceByAccountResponse {
  @ApiProperty({ type: AssetInfoResponse })
  token: AssetInfoResponse;

  @ApiProperty()
  walletBalance: string;
}

export class AssetEstimateMaxWithdrawalResponse {
  @ApiProperty()
  max: string;
}
