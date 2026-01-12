import type { FeeConfig, SwapRequest, MatchResult } from "./types";
import { RuleMatcher } from "./matcher";
import { CachedTokenRegistry, type TokenRegistryConfig } from "./token-registry";
import { validateConfig, type ValidationResult } from "./validator";

const DEFAULT_TOKEN_REGISTRY_URL = "https://1click.chaindefuser.com/v0/tokens";
const DEFAULT_CACHE_TTL_MS = 3600000; // 1 hour

export interface RuleEngineConfig {
  feeConfig: FeeConfig;
  tokenRegistry?: Partial<TokenRegistryConfig>;
}

export class RuleEngine {
  private matcher: RuleMatcher;
  private tokenRegistry: CachedTokenRegistry;
  private feeConfig: FeeConfig;

  constructor(config: RuleEngineConfig) {
    this.feeConfig = config.feeConfig;
    this.tokenRegistry = new CachedTokenRegistry({
      url: config.tokenRegistry?.url ?? DEFAULT_TOKEN_REGISTRY_URL,
      cacheTtlMs: config.tokenRegistry?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS,
    });
    this.matcher = new RuleMatcher(this.feeConfig, this.tokenRegistry);
  }

  static validate(feeConfig: FeeConfig): ValidationResult {
    return validateConfig(feeConfig);
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
