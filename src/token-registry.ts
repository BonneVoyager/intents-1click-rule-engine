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

function isValidTokenResponse(token: unknown): token is ApiTokenResponse {
  if (typeof token !== "object" || token === null) return false;
  const t = token as Record<string, unknown>;
  return (
    typeof t.assetId === "string" &&
    typeof t.blockchain === "string" &&
    typeof t.symbol === "string" &&
    typeof t.decimals === "number"
  );
}

export class CachedTokenRegistry implements TokenRegistry {
  private config: TokenRegistryConfig;
  private cache: Map<string, TokenInfo> = new Map();
  private lastFetchTime: number = 0;
  private refreshPromise: Promise<void> | null = null;

  constructor(config: TokenRegistryConfig) {
    this.config = config;
  }

  private isCacheValid(): boolean {
    return Date.now() - this.lastFetchTime < this.config.cacheTtlMs;
  }

  async refresh(): Promise<void> {
    // If a refresh is already in progress, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<void> {
    const response = await fetch(this.config.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error(`Invalid token registry response: expected array, got ${typeof data}`);
    }

    const newCache = new Map<string, TokenInfo>();
    const invalidTokens: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const token = data[i];
      if (!isValidTokenResponse(token)) {
        invalidTokens.push(i);
        continue;
      }
      newCache.set(token.assetId, {
        assetId: token.assetId,
        blockchain: token.blockchain,
        symbol: token.symbol,
        decimals: token.decimals,
      });
    }

    if (invalidTokens.length > 0 && newCache.size === 0) {
      throw new Error(`Invalid token registry response: all ${data.length} tokens failed validation`);
    }

    this.cache = newCache;
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
