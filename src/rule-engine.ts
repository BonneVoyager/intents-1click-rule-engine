import type { Fee, FeeConfig, SwapRequest, MatchResult } from "./types";
import { RuleMatcher } from "./matcher";
import { CachedTokenRegistry, type TokenRegistryConfig } from "./token-registry";
import { validateConfig } from "./validator";

const DEFAULT_TOKEN_REGISTRY_URL = "https://1click.chaindefuser.com/v0/tokens";
const DEFAULT_CACHE_TTL_MS = 3600000; // 1 hour
const BPS_DIVISOR = 10000n;

export function getTotalBps(fee: Fee | Fee[]): number {
  if (Array.isArray(fee)) {
    return fee.reduce((sum, f) => sum + f.bps, 0);
  }
  return fee.bps;
}

export function calculateFee(amount: string | bigint, bps: number): string {
  const amountBigInt = typeof amount === "string" ? BigInt(amount) : amount;
  const fee = (amountBigInt * BigInt(bps)) / BPS_DIVISOR;
  return fee.toString();
}

export function calculateAmountAfterFee(amount: string | bigint, bps: number): string {
  const amountBigInt = typeof amount === "string" ? BigInt(amount) : amount;
  const fee = BigInt(calculateFee(amountBigInt, bps));
  return (amountBigInt - fee).toString();
}

export interface RuleEngineOptions {
  tokenRegistryUrl?: string;
  tokenRegistryCacheTtlMs?: number;
}

export class RuleEngine {
  private matcher: RuleMatcher;
  private tokenRegistry: CachedTokenRegistry;
  private feeConfig: FeeConfig;

  constructor(feeConfig: FeeConfig, options?: RuleEngineOptions) {
    const validation = validateConfig(feeConfig);
    if (!validation.valid) {
      throw new Error(`Invalid fee config: ${validation.errors.map((e) => `${e.path}: ${e.message}`).join(", ")}`);
    }

    this.feeConfig = feeConfig;
    this.tokenRegistry = new CachedTokenRegistry({
      url: options?.tokenRegistryUrl ?? DEFAULT_TOKEN_REGISTRY_URL,
      cacheTtlMs: options?.tokenRegistryCacheTtlMs ?? DEFAULT_CACHE_TTL_MS,
    });
    this.matcher = new RuleMatcher(this.feeConfig, this.tokenRegistry);
  }

  async initialize(): Promise<void> {
    await this.tokenRegistry.refresh();
  }

  async ensureReady(): Promise<void> {
    await this.tokenRegistry.ensureFresh();
  }

  match(request: SwapRequest): MatchResult {
    return this.matcher.match(request);
  }

  async matchWithRefresh(request: SwapRequest): Promise<MatchResult> {
    await this.ensureReady();
    return this.match(request);
  }

  getTokenRegistrySize(): number {
    return this.tokenRegistry.size;
  }

  getFeeConfig(): FeeConfig {
    return this.feeConfig;
  }
}
