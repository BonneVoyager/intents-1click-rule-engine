import { describe, it, expect } from "bun:test";
import { RuleMatcher } from "./matcher";
import type { Fee, FeeConfig, TokenInfo, TokenRegistry } from "./types";

// Helper to get bps from fee (handles both single Fee and Fee[])
function getBps(fee: Fee | Fee[]): number {
  if (Array.isArray(fee)) {
    return fee.reduce((sum, f) => sum + f.bps, 0);
  }
  return fee.bps;
}

// Mock token registry for tests
function createMockRegistry(tokens: TokenInfo[]): TokenRegistry {
  const byAssetId = new Map(tokens.map((t) => [t.assetId, t]));
  return {
    getToken: (assetId: string) => byAssetId.get(assetId),
  };
}

// Sample tokens mimicking real data from the API
const TOKENS: TokenInfo[] = [
  {
    assetId: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
    blockchain: "eth",
    symbol: "USDC",
    decimals: 6,
  },
  {
    assetId: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
    blockchain: "polygon",
    symbol: "USDC",
    decimals: 6,
  },
  {
    assetId: "nep141:eth-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.omft.near",
    blockchain: "eth",
    symbol: "WBTC",
    decimals: 8,
  },
  {
    assetId: "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
    blockchain: "arb",
    symbol: "USDC",
    decimals: 6,
  },
  {
    assetId: "nep141:sol-usdc.omft.near",
    blockchain: "sol",
    symbol: "USDC",
    decimals: 6,
  },
];

const registry = createMockRegistry(TOKENS);

describe("RuleMatcher", () => {
  describe("default fee", () => {
    it("returns default fee when no rules exist", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:eth-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.omft.near",
      });

      expect(result.matched).toBe(false);
      expect(getBps(result.fee)).toBe(20);
    });

    it("returns default fee when token not found in registry", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "unknown-asset",
        destinationAsset: "nep141:eth-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.omft.near",
      });

      expect(result.matched).toBe(false);
      expect(getBps(result.fee)).toBe(20);
      expect(result.matchDetails).toBeUndefined();
    });
  });

  describe("symbol matching", () => {
    it("matches USDC to USDC swap across chains", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "usdc-to-usdc",
            enabled: true,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 10, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(result.rule?.id).toBe("usdc-to-usdc");
      expect(getBps(result.fee)).toBe(10);
      expect(result.matchDetails?.originToken.blockchain).toBe("eth");
      expect(result.matchDetails?.destinationToken.blockchain).toBe("polygon");
    });

    it("does not match USDC to WBTC for USDC-only rule", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "usdc-to-usdc",
            enabled: true,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 10, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:eth-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.omft.near",
      });

      expect(result.matched).toBe(false);
      expect(getBps(result.fee)).toBe(20);
    });
  });

  describe("wildcard matching", () => {
    it("matches * wildcard for blockchain", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "all-usdc",
            enabled: true,
            match: {
              in: { blockchain: "*", symbol: "USDC" },
              out: { blockchain: "*", symbol: "USDC" },
            },
            fee: { type: "bps", bps: 5, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
        destinationAsset: "nep141:sol-usdc.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(getBps(result.fee)).toBe(5);
    });
  });

  describe("assetId matching", () => {
    it("matches exact assetId pair", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "eth-usdc-to-wbtc",
            enabled: true,
            match: {
              in: { assetId: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near" },
              out: { assetId: "nep141:eth-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.omft.near" },
            },
            fee: { type: "bps", bps: 3, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:eth-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(result.rule?.id).toBe("eth-usdc-to-wbtc");
      expect(getBps(result.fee)).toBe(3);
    });
  });

  describe("wildcard symbol matching", () => {
    it("matches * wildcard for symbol", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "eth-to-any",
            enabled: true,
            match: {
              in: { blockchain: "eth", symbol: "*" },
              out: { blockchain: "*", symbol: "*" },
            },
            fee: { type: "bps", bps: 12, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:sol-usdc.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(getBps(result.fee)).toBe(12);
    });
  });

  describe("priority ordering", () => {
    it("uses default priority of 100 when not specified", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "no-priority",
            enabled: true,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 10, recipient: "fees.near" },
          },
          {
            id: "low-priority",
            enabled: true,
            priority: 50,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 15, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(result.rule?.id).toBe("no-priority");
      expect(getBps(result.fee)).toBe(10);
    });

    it("first matching rule wins when priorities are equal", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "first-rule",
            enabled: true,
            priority: 100,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 5, recipient: "fees.near" },
          },
          {
            id: "second-rule",
            enabled: true,
            priority: 100,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 10, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(result.rule?.id).toBe("first-rule");
      expect(getBps(result.fee)).toBe(5);
    });

    it("higher priority rule wins over lower priority", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "low-priority",
            enabled: true,
            priority: 50,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 15, recipient: "fees.near" },
          },
          {
            id: "high-priority",
            enabled: true,
            priority: 100,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 5, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(result.rule?.id).toBe("high-priority");
      expect(getBps(result.fee)).toBe(5);
    });

    it("more specific assetId rule should have higher priority", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "generic-usdc",
            enabled: true,
            priority: 100,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 10, recipient: "fees.near" },
          },
          {
            id: "specific-eth-polygon",
            enabled: true,
            priority: 200,
            match: {
              in: { assetId: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near" },
              out: { assetId: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near" },
            },
            fee: { type: "bps", bps: 2, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(result.rule?.id).toBe("specific-eth-polygon");
      expect(getBps(result.fee)).toBe(2);
    });
  });

  describe("disabled rules", () => {
    it("skips disabled rules", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "disabled-rule",
            enabled: false,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 1, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(false);
      expect(getBps(result.fee)).toBe(20);
    });
  });

  describe("mixed matching (blockchain + symbol + assetId)", () => {
    it("matches blockchain + symbol combination", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "eth-usdc-to-any-wbtc",
            enabled: true,
            match: {
              in: { blockchain: "eth", symbol: "USDC" },
              out: { symbol: "WBTC" },
            },
            fee: { type: "bps", bps: 7, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);

      // ETH USDC → ETH WBTC should match
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:eth-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(getBps(result.fee)).toBe(7);
    });

    it("does not match when blockchain differs in mixed rule", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "eth-usdc-to-any-wbtc",
            enabled: true,
            match: {
              in: { blockchain: "eth", symbol: "USDC" },
              out: { symbol: "WBTC" },
            },
            fee: { type: "bps", bps: 7, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);

      // ARB USDC → ETH WBTC should NOT match (wrong origin blockchain)
      const result = matcher.match({
        originAsset: "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
        destinationAsset: "nep141:eth-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.omft.near",
      });

      expect(result.matched).toBe(false);
      expect(getBps(result.fee)).toBe(20);
    });

    it("matches assetId + symbol combination", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "specific-usdc-to-any-usdc",
            enabled: true,
            match: {
              in: { assetId: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near" },
              out: { symbol: "USDC", blockchain: "*" },
            },
            fee: { type: "bps", bps: 4, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);

      // Exact ETH USDC → any USDC should match
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:sol-usdc.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(getBps(result.fee)).toBe(4);
    });
  });

  describe("array matching", () => {
    it("matches when blockchain is in array", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "l2-chains",
            enabled: true,
            match: {
              in: { blockchain: ["arb", "polygon", "sol"] },
              out: { blockchain: "*" },
            },
            fee: { type: "bps", bps: 5, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);

      // ARB should match
      const result = matcher.match({
        originAsset: "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
        destinationAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(getBps(result.fee)).toBe(5);
    });

    it("does not match when blockchain is not in array", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "l2-chains",
            enabled: true,
            match: {
              in: { blockchain: ["arb", "polygon", "sol"] },
              out: { blockchain: "*" },
            },
            fee: { type: "bps", bps: 5, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);

      // ETH should NOT match
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:sol-usdc.omft.near",
      });

      expect(result.matched).toBe(false);
      expect(getBps(result.fee)).toBe(20);
    });

    it("matches when symbol is in array", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "stablecoins",
            enabled: true,
            match: {
              in: { symbol: ["USDC", "USDT", "DAI"] },
              out: { symbol: ["USDC", "USDT", "DAI"] },
            },
            fee: { type: "bps", bps: 3, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);

      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(getBps(result.fee)).toBe(3);
    });

    it("combines array with negation (OR logic)", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "arb-or-not-eth",
            enabled: true,
            match: {
              in: { blockchain: ["arb", "!eth"] },
              out: { blockchain: "*" },
            },
            fee: { type: "bps", bps: 7, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);

      // ARB matches ("arb" matches)
      const result1 = matcher.match({
        originAsset: "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
        destinationAsset: "nep141:sol-usdc.omft.near",
      });
      expect(result1.matched).toBe(true);

      // Polygon matches ("!eth" matches - polygon is not eth)
      const result2 = matcher.match({
        originAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
        destinationAsset: "nep141:sol-usdc.omft.near",
      });
      expect(result2.matched).toBe(true);

      // ETH does NOT match ("arb" fails, "!eth" fails)
      const result3 = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:sol-usdc.omft.near",
      });
      expect(result3.matched).toBe(false);
    });
  });

  describe("time-based rules", () => {
    it("matches rule with no time constraints", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "no-time-limit",
            enabled: true,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 10, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(getBps(result.fee)).toBe(10);
    });

    it("matches rule when current time is after valid_from", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "started-yesterday",
            enabled: true,
            valid_from: pastDate,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 5, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(getBps(result.fee)).toBe(5);
    });

    it("does not match rule when current time is before valid_from", () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day from now
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "starts-tomorrow",
            enabled: true,
            valid_from: futureDate,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 5, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(false);
      expect(getBps(result.fee)).toBe(20);
    });

    it("matches rule when current time is before valid_until", () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day from now
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "ends-tomorrow",
            enabled: true,
            valid_until: futureDate,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 5, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(getBps(result.fee)).toBe(5);
    });

    it("does not match rule when current time is after valid_until", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "ended-yesterday",
            enabled: true,
            valid_until: pastDate,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 5, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(false);
      expect(getBps(result.fee)).toBe(20);
    });

    it("matches rule within valid_from and valid_until range", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "promo-active",
            enabled: true,
            valid_from: pastDate,
            valid_until: futureDate,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 0, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(getBps(result.fee)).toBe(0);
    });
  });

  describe("negation matching", () => {
    it("matches when blockchain is not the negated value", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "not-eth",
            enabled: true,
            match: {
              in: { blockchain: "!eth" },
              out: { blockchain: "*" },
            },
            fee: { type: "bps", bps: 5, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);

      // ARB → SOL should match (not eth)
      const result = matcher.match({
        originAsset: "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
        destinationAsset: "nep141:sol-usdc.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(getBps(result.fee)).toBe(5);
    });

    it("does not match when blockchain equals negated value", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "not-eth",
            enabled: true,
            match: {
              in: { blockchain: "!eth" },
              out: { blockchain: "*" },
            },
            fee: { type: "bps", bps: 5, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);

      // ETH → SOL should NOT match
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:sol-usdc.omft.near",
      });

      expect(result.matched).toBe(false);
      expect(getBps(result.fee)).toBe(20);
    });

    it("matches negated symbol", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "not-usdc",
            enabled: true,
            match: {
              in: { symbol: "!USDC" },
              out: { symbol: "*" },
            },
            fee: { type: "bps", bps: 15, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);

      // WBTC → USDC should match (WBTC is not USDC)
      const result = matcher.match({
        originAsset: "nep141:eth-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.omft.near",
        destinationAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(getBps(result.fee)).toBe(15);
    });

    it("combines negation with other matchers", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "usdc-not-to-eth",
            enabled: true,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC", blockchain: "!eth" },
            },
            fee: { type: "bps", bps: 8, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);

      // ETH USDC → Polygon USDC should match (polygon is not eth)
      const result1 = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });
      expect(result1.matched).toBe(true);
      expect(getBps(result1.fee)).toBe(8);

      // ETH USDC → ETH USDC should NOT match (eth is eth)
      const result2 = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
      });
      expect(result2.matched).toBe(false);
    });
  });

  describe("blockchain matching", () => {
    it("matches specific blockchain routes", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "eth-to-polygon",
            enabled: true,
            match: {
              in: { blockchain: "eth" },
              out: { blockchain: "polygon" },
            },
            fee: { type: "bps", bps: 8, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(result.rule?.id).toBe("eth-to-polygon");
      expect(getBps(result.fee)).toBe(8);
    });
  });

  describe("multiple fee recipients", () => {
    it("returns fee array when rule has multiple fees", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "partner-split",
            enabled: true,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: [
              { type: "bps", bps: 7, recipient: "fees.near" },
              { type: "bps", bps: 3, recipient: "partner.near" },
            ],
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(Array.isArray(result.fee)).toBe(true);
      expect(getBps(result.fee)).toBe(10);

      const fees = result.fee as Fee[];
      expect(fees).toHaveLength(2);
      expect(fees[0]?.bps).toBe(7);
      expect(fees[0]?.recipient).toBe("fees.near");
      expect(fees[1]?.bps).toBe(3);
      expect(fees[1]?.recipient).toBe("partner.near");
    });

    it("returns default fee array when no rules match", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: [
          { type: "bps", bps: 15, recipient: "fees.near" },
          { type: "bps", bps: 5, recipient: "treasury.near" },
        ],
        rules: [],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(false);
      expect(Array.isArray(result.fee)).toBe(true);
      expect(getBps(result.fee)).toBe(20);

      const fees = result.fee as Fee[];
      expect(fees).toHaveLength(2);
      expect(fees[0]?.recipient).toBe("fees.near");
      expect(fees[1]?.recipient).toBe("treasury.near");
    });
  });

  describe("matchDetails.matchedBy", () => {
    it("includes matchedBy info when matching by symbol only", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "usdc-to-usdc",
            enabled: true,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 10, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(result.matchDetails?.in?.matchedBy).toEqual({ symbol: true });
      expect(result.matchDetails?.out?.matchedBy).toEqual({ symbol: true });
    });

    it("includes matchedBy info when matching by blockchain only", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "eth-to-polygon",
            enabled: true,
            match: {
              in: { blockchain: "eth" },
              out: { blockchain: "polygon" },
            },
            fee: { type: "bps", bps: 8, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(result.matchDetails?.in?.matchedBy).toEqual({ blockchain: true });
      expect(result.matchDetails?.out?.matchedBy).toEqual({ blockchain: true });
    });

    it("includes matchedBy info when matching by assetId", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "exact-pair",
            enabled: true,
            match: {
              in: { assetId: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near" },
              out: { assetId: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near" },
            },
            fee: { type: "bps", bps: 5, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(result.matchDetails?.in?.matchedBy).toEqual({ assetId: true });
      expect(result.matchDetails?.out?.matchedBy).toEqual({ assetId: true });
    });

    it("includes matchedBy info when matching by multiple criteria", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "eth-usdc-to-polygon-usdc",
            enabled: true,
            match: {
              in: { blockchain: "eth", symbol: "USDC" },
              out: { blockchain: "polygon", symbol: "USDC" },
            },
            fee: { type: "bps", bps: 5, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(result.matchDetails?.in?.matchedBy).toEqual({ blockchain: true, symbol: true });
      expect(result.matchDetails?.out?.matchedBy).toEqual({ blockchain: true, symbol: true });
    });

    it("includes token info in matchDetails", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "usdc-swap",
            enabled: true,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 10, recipient: "fees.near" },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(result.matchDetails?.in?.token.blockchain).toBe("eth");
      expect(result.matchDetails?.in?.token.symbol).toBe("USDC");
      expect(result.matchDetails?.out?.token.blockchain).toBe("polygon");
      expect(result.matchDetails?.out?.token.symbol).toBe("USDC");
    });

    it("does not include in/out matchDetails when no rule matches", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(false);
      expect(result.matchDetails?.originToken).toBeDefined();
      expect(result.matchDetails?.destinationToken).toBeDefined();
      expect(result.matchDetails?.in).toBeUndefined();
      expect(result.matchDetails?.out).toBeUndefined();
    });
  });

});
