import { describe, it, expect } from "bun:test";
import { RuleEngine } from "./rule-engine";
import type { FeeConfig } from "./types";

const validConfig: FeeConfig = {
  version: "1.0.0",
  default_fee: { type: "bps", bps: 20 },
  rules: [
    {
      id: "usdc-swaps",
      enabled: true,
      match: {
        in: { symbol: "USDC" },
        out: { symbol: "USDC" },
      },
      fee: { type: "bps", bps: 10 },
    },
  ],
};

describe("RuleEngine", () => {
  describe("constructor", () => {
    it("creates engine with valid config", () => {
      const engine = new RuleEngine(validConfig);
      expect(engine).toBeDefined();
      expect(engine.getFeeConfig()).toEqual(validConfig);
    });

    it("throws on invalid config - missing version", () => {
      const invalidConfig = {
        default_fee: { type: "bps", bps: 20 },
        rules: [],
      } as unknown as FeeConfig;

      expect(() => new RuleEngine(invalidConfig)).toThrow("Invalid fee config");
    });

    it("throws on invalid config - missing default_fee", () => {
      const invalidConfig = {
        version: "1.0.0",
        rules: [],
      } as unknown as FeeConfig;

      expect(() => new RuleEngine(invalidConfig)).toThrow("Invalid fee config");
    });

    it("throws on invalid config - duplicate rule ids", () => {
      const invalidConfig: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20 },
        rules: [
          {
            id: "same-id",
            enabled: true,
            match: { in: { symbol: "USDC" }, out: { symbol: "USDC" } },
            fee: { type: "bps", bps: 10 },
          },
          {
            id: "same-id",
            enabled: true,
            match: { in: { symbol: "WBTC" }, out: { symbol: "WBTC" } },
            fee: { type: "bps", bps: 15 },
          },
        ],
      };

      expect(() => new RuleEngine(invalidConfig)).toThrow("Invalid fee config");
    });

    it("throws on invalid config - missing rule identifier", () => {
      const invalidConfig: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20 },
        rules: [
          {
            id: "test",
            enabled: true,
            match: { in: {}, out: { symbol: "USDC" } },
            fee: { type: "bps", bps: 10 },
          },
        ],
      };

      expect(() => new RuleEngine(invalidConfig)).toThrow("Invalid fee config");
    });

    it("uses default token registry config when not provided", () => {
      const engine = new RuleEngine(validConfig);
      expect(engine).toBeDefined();
    });

    it("accepts custom token registry options", () => {
      const engine = new RuleEngine(validConfig, {
        tokenRegistryUrl: "https://custom-api.com/tokens",
        tokenRegistryCacheTtlMs: 1800000,
      });
      expect(engine).toBeDefined();
    });

    it("accepts partial token registry options", () => {
      const engine = new RuleEngine(validConfig, {
        tokenRegistryCacheTtlMs: 1800000,
      });
      expect(engine).toBeDefined();
    });
  });

  describe("match", () => {
    it("returns default fee when token not in registry", () => {
      const engine = new RuleEngine(validConfig);

      const result = engine.match({
        originAsset: "unknown-asset",
        destinationAsset: "another-unknown",
      });

      expect(result.matched).toBe(false);
      expect(result.fee.bps).toBe(20);
    });
  });
});
