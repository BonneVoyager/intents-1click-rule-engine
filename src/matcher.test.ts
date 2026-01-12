import { describe, it, expect } from "bun:test";
import { RuleMatcher } from "./matcher";
import type { FeeConfig, TokenInfo, TokenRegistry } from "./types";

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
        default_fee: { type: "bps", bps: 20 },
        rules: [],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:eth-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.omft.near",
      });

      expect(result.matched).toBe(false);
      expect(result.fee.bps).toBe(20);
    });

    it("returns default fee when token not found in registry", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20 },
        rules: [],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "unknown-asset",
        destinationAsset: "nep141:eth-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.omft.near",
      });

      expect(result.matched).toBe(false);
      expect(result.fee.bps).toBe(20);
      expect(result.matchDetails).toBeUndefined();
    });
  });

  describe("symbol matching", () => {
    it("matches USDC to USDC swap across chains", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20 },
        rules: [
          {
            id: "usdc-to-usdc",
            enabled: true,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 10 },
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
      expect(result.fee.bps).toBe(10);
      expect(result.matchDetails?.originToken.blockchain).toBe("eth");
      expect(result.matchDetails?.destinationToken.blockchain).toBe("polygon");
    });

    it("does not match USDC to WBTC for USDC-only rule", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20 },
        rules: [
          {
            id: "usdc-to-usdc",
            enabled: true,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 10 },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:eth-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.omft.near",
      });

      expect(result.matched).toBe(false);
      expect(result.fee.bps).toBe(20);
    });
  });

  describe("wildcard matching", () => {
    it("matches * wildcard for blockchain", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20 },
        rules: [
          {
            id: "all-usdc",
            enabled: true,
            match: {
              in: { blockchain: "*", symbol: "USDC" },
              out: { blockchain: "*", symbol: "USDC" },
            },
            fee: { type: "bps", bps: 5 },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
        destinationAsset: "nep141:sol-usdc.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(result.fee.bps).toBe(5);
    });
  });

  describe("assetId matching", () => {
    it("matches exact assetId pair", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20 },
        rules: [
          {
            id: "eth-usdc-to-wbtc",
            enabled: true,
            match: {
              in: { assetId: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near" },
              out: { assetId: "nep141:eth-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.omft.near" },
            },
            fee: { type: "bps", bps: 3 },
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
      expect(result.fee.bps).toBe(3);
    });
  });

  describe("wildcard symbol matching", () => {
    it("matches * wildcard for symbol", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20 },
        rules: [
          {
            id: "eth-to-any",
            enabled: true,
            match: {
              in: { blockchain: "eth", symbol: "*" },
              out: { blockchain: "*", symbol: "*" },
            },
            fee: { type: "bps", bps: 12 },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:sol-usdc.omft.near",
      });

      expect(result.matched).toBe(true);
      expect(result.fee.bps).toBe(12);
    });
  });

  describe("priority ordering", () => {
    it("uses default priority of 100 when not specified", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20 },
        rules: [
          {
            id: "no-priority",
            enabled: true,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 10 },
          },
          {
            id: "low-priority",
            enabled: true,
            priority: 50,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 15 },
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
      expect(result.fee.bps).toBe(10);
    });

    it("first matching rule wins when priorities are equal", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20 },
        rules: [
          {
            id: "first-rule",
            enabled: true,
            priority: 100,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 5 },
          },
          {
            id: "second-rule",
            enabled: true,
            priority: 100,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 10 },
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
      expect(result.fee.bps).toBe(5);
    });

    it("higher priority rule wins over lower priority", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20 },
        rules: [
          {
            id: "low-priority",
            enabled: true,
            priority: 50,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 15 },
          },
          {
            id: "high-priority",
            enabled: true,
            priority: 100,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 5 },
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
      expect(result.fee.bps).toBe(5);
    });

    it("more specific assetId rule should have higher priority", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20 },
        rules: [
          {
            id: "generic-usdc",
            enabled: true,
            priority: 100,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 10 },
          },
          {
            id: "specific-eth-polygon",
            enabled: true,
            priority: 200,
            match: {
              in: { assetId: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near" },
              out: { assetId: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near" },
            },
            fee: { type: "bps", bps: 2 },
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
      expect(result.fee.bps).toBe(2);
    });
  });

  describe("disabled rules", () => {
    it("skips disabled rules", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20 },
        rules: [
          {
            id: "disabled-rule",
            enabled: false,
            match: {
              in: { symbol: "USDC" },
              out: { symbol: "USDC" },
            },
            fee: { type: "bps", bps: 1 },
          },
        ],
      };

      const matcher = new RuleMatcher(config, registry);
      const result = matcher.match({
        originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
        destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
      });

      expect(result.matched).toBe(false);
      expect(result.fee.bps).toBe(20);
    });
  });

  describe("mixed matching (blockchain + symbol + assetId)", () => {
    it("matches blockchain + symbol combination", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20 },
        rules: [
          {
            id: "eth-usdc-to-any-wbtc",
            enabled: true,
            match: {
              in: { blockchain: "eth", symbol: "USDC" },
              out: { symbol: "WBTC" },
            },
            fee: { type: "bps", bps: 7 },
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
      expect(result.fee.bps).toBe(7);
    });

    it("does not match when blockchain differs in mixed rule", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20 },
        rules: [
          {
            id: "eth-usdc-to-any-wbtc",
            enabled: true,
            match: {
              in: { blockchain: "eth", symbol: "USDC" },
              out: { symbol: "WBTC" },
            },
            fee: { type: "bps", bps: 7 },
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
      expect(result.fee.bps).toBe(20);
    });

    it("matches assetId + symbol combination", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20 },
        rules: [
          {
            id: "specific-usdc-to-any-usdc",
            enabled: true,
            match: {
              in: { assetId: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near" },
              out: { symbol: "USDC", blockchain: "*" },
            },
            fee: { type: "bps", bps: 4 },
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
      expect(result.fee.bps).toBe(4);
    });
  });

  describe("blockchain matching", () => {
    it("matches specific blockchain routes", () => {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20 },
        rules: [
          {
            id: "eth-to-polygon",
            enabled: true,
            match: {
              in: { blockchain: "eth" },
              out: { blockchain: "polygon" },
            },
            fee: { type: "bps", bps: 8 },
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
      expect(result.fee.bps).toBe(8);
    });
  });

});
