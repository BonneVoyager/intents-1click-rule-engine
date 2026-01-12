export interface TokenInfo {
  assetId: string;
  blockchain: string;
  symbol: string;
  decimals: number;
}

/**
 * Matcher for filtering tokens by blockchain, symbol, or assetId.
 *
 * **Important: All string matching is case-sensitive.**
 * - `symbol: "USDC"` will NOT match a token with symbol `"usdc"` or `"Usdc"`
 * - `blockchain: "eth"` will NOT match `"ETH"` or `"Eth"`
 *
 * Supported patterns:
 * - Exact match: `"eth"` matches only `"eth"`
 * - Wildcard: `"*"` matches any value
 * - Negation: `"!eth"` matches any value except `"eth"`
 * - Array (OR logic): `["eth", "base"]` matches `"eth"` or `"base"`
 */
export interface TokenMatcher {
  blockchain?: string | string[];
  symbol?: string | string[];
  assetId?: string | string[];
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

export interface TokenMatchInfo {
  token: TokenInfo;
  matchedBy: {
    assetId?: boolean;
    blockchain?: boolean;
    symbol?: boolean;
  };
}

export interface MatchResult {
  matched: boolean;
  rule?: Rule;
  fee: Fee | Fee[];
  matchDetails?: {
    originToken: TokenInfo;
    destinationToken: TokenInfo;
    in?: TokenMatchInfo;
    out?: TokenMatchInfo;
  };
}

export interface TokenRegistry {
  getToken(assetId: string): TokenInfo | undefined;
}
