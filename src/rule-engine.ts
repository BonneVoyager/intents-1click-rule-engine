import type { Fee, FeeConfig, SwapRequest, MatchResult, TokenRegistry } from "./types";
import { RuleMatcher } from "./matcher";
import { sharedTokenRegistry } from "./token-registry";
import { validateConfig } from "./validator";

const BPS_DIVISOR = 10000n;
const MAX_BPS = 10000; // 100% fee cap

export function getTotalBps(fee: Fee | Fee[]): number {
  if (Array.isArray(fee)) {
    return fee.reduce((sum, f) => sum + f.bps, 0);
  }
  return fee.bps;
}

function parseAmount(amount: string | bigint): bigint {
  if (typeof amount === "bigint") {
    return amount;
  }
  if (typeof amount !== "string") {
    throw new Error(`Invalid amount: expected string or bigint, got ${typeof amount}`);
  }
  if (amount.trim() === "") {
    throw new Error("Invalid amount: empty string");
  }
  if (!/^-?\d+$/.test(amount)) {
    throw new Error(`Invalid amount: "${amount}" is not a valid integer string`);
  }
  const result = BigInt(amount);
  if (result < 0n) {
    throw new Error(`Invalid amount: "${amount}" must be non-negative`);
  }
  return result;
}

function validateBps(bps: number): void {
  if (typeof bps !== "number" || !Number.isFinite(bps)) {
    throw new Error(`Invalid bps: expected a finite number, got ${bps}`);
  }
  if (!Number.isInteger(bps)) {
    throw new Error(`Invalid bps: ${bps} must be an integer`);
  }
  if (bps < 0) {
    throw new Error(`Invalid bps: ${bps} must be non-negative`);
  }
  if (bps > MAX_BPS) {
    throw new Error(`Invalid bps: ${bps} exceeds maximum of ${MAX_BPS} (100%)`);
  }
}

export function calculateFee(amount: string | bigint, bps: number): string {
  const amountBigInt = parseAmount(amount);
  validateBps(bps);
  const fee = (amountBigInt * BigInt(bps)) / BPS_DIVISOR;
  return fee.toString();
}

export function calculateAmountAfterFee(amount: string | bigint, bps: number): string {
  const amountBigInt = parseAmount(amount);
  validateBps(bps);
  const fee = BigInt(calculateFee(amountBigInt, bps));
  return (amountBigInt - fee).toString();
}

export interface RuleEngineOptions {
  /**
   * Custom token registry instance. If not provided, uses the shared global registry.
   * Useful for testing or when you need a separate token cache.
   */
  tokenRegistry?: TokenRegistry;
}

export class RuleEngine {
  private matcher: RuleMatcher;
  private tokenRegistry: TokenRegistry;
  private feeConfig: FeeConfig;

  constructor(feeConfig: FeeConfig, options?: RuleEngineOptions) {
    const validation = validateConfig(feeConfig);
    if (!validation.valid) {
      throw new Error(`Invalid fee config: ${validation.errors.map((e) => `${e.path}: ${e.message}`).join(", ")}`);
    }

    this.feeConfig = feeConfig;
    this.tokenRegistry = options?.tokenRegistry ?? sharedTokenRegistry;
    this.matcher = new RuleMatcher(this.feeConfig, this.tokenRegistry);
  }

  async ensureReady(): Promise<void> {
    await this.tokenRegistry.ensureFresh();
  }

  match(request: SwapRequest): MatchResult {
    if (!this.tokenRegistry.isFresh()) {
      throw new Error("Token registry is not ready. Call ensureReady() or use safeMatch() instead.");
    }
    return this.matcher.match(request);
  }

  async safeMatch(request: SwapRequest): Promise<MatchResult> {
    await this.ensureReady();
    return this.match(request);
  }

  getTokenRegistrySize(): number {
    return this.tokenRegistry.size ?? 0;
  }

  getFeeConfig(): FeeConfig {
    return this.feeConfig;
  }
}
