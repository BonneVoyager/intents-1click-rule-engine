export interface TokenInfo {
  assetId: string;
  blockchain: string;
  symbol: string;
  decimals: number;
}

export interface TokenMatcher {
  blockchain?: string | string[];
  symbol?: string | string[];
  assetId?: string;
}

export interface RuleMatch {
  in: TokenMatcher;
  out: TokenMatcher;
}

export interface Fee {
  type: "bps";
  bps: number;
  recipient: string;
}

export interface Rule {
  id: string;
  enabled: boolean;
  priority?: number;
  description?: string;
  match: RuleMatch;
  fee: Fee | Fee[];
  valid_from?: string;
  valid_until?: string;
}

export interface FeeConfig {
  version: string;
  default_fee: Fee | Fee[];
  rules: Rule[];
}

export interface SwapRequest {
  originAsset: string;
  destinationAsset: string;
  amount?: string;
}

export interface MatchResult {
  matched: boolean;
  rule?: Rule;
  fee: Fee | Fee[];
  matchDetails?: {
    originToken: TokenInfo;
    destinationToken: TokenInfo;
  };
}

export interface TokenRegistry {
  getToken(assetId: string): TokenInfo | undefined;
}
