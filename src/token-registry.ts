import type { TokenInfo, TokenRegistry } from "./types";

export interface TokenRegistryConfig {
  url: string;
  cacheTtlMs: number;
}

interface ApiTokenResponse {
  assetId: string;
  decimals: number;
  blockchain: string;
  symbol: string;
  price?: number;
  priceUpdatedAt?: string;
  contractAddress?: string;
}

export class CachedTokenRegistry implements TokenRegistry {
  private config: TokenRegistryConfig;
  private cache: Map<string, TokenInfo> = new Map();
  private lastFetchTime: number = 0;

  constructor(config: TokenRegistryConfig) {
    this.config = config;
  }

  private isCacheValid(): boolean {
    return Date.now() - this.lastFetchTime < this.config.cacheTtlMs;
  }

  async refresh(): Promise<void> {
    const response = await fetch(this.config.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.status} ${response.statusText}`);
    }

    const tokens = (await response.json()) as ApiTokenResponse[];
    this.cache.clear();

    for (const token of tokens) {
      this.cache.set(token.assetId, {
        assetId: token.assetId,
        blockchain: token.blockchain,
        symbol: token.symbol,
        decimals: token.decimals,
      });
    }

    this.lastFetchTime = Date.now();
  }

  async ensureFresh(): Promise<void> {
    if (!this.isCacheValid()) {
      await this.refresh();
    }
  }

  getToken(assetId: string): TokenInfo | undefined {
    return this.cache.get(assetId);
  }

  getAllTokens(): TokenInfo[] {
    return Array.from(this.cache.values());
  }

  get size(): number {
    return this.cache.size;
  }
}
