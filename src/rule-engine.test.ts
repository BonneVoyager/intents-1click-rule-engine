import { describe, it, expect } from "bun:test";
import { RuleEngine, calculateFee, calculateAmountAfterFee } from "./rule-engine";
import type { FeeConfig } from "./types";

const validConfig: FeeConfig = {
  version: "1.0.0",
  default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
  rules: [
    {
      id: "usdc-swaps",
      enabled: true,
      match: {
        in: { symbol: "USDC" },
        out: { symbol: "USDC" },
      },
      fee: { type: "bps", bps: 10, recipient: "fees.near" },
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
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "same-id",
            enabled: true,
            match: { in: { symbol: "USDC" }, out: { symbol: "USDC" } },
            fee: { type: "bps", bps: 10, recipient: "fees.near" },
          },
          {
            id: "same-id",
            enabled: true,
            match: { in: { symbol: "WBTC" }, out: { symbol: "WBTC" } },
            fee: { type: "bps", bps: 15, recipient: "fees.near" },
          },
        ],
      };

      expect(() => new RuleEngine(invalidConfig)).toThrow("Invalid fee config");
    });

    it("throws on invalid config - missing rule identifier", () => {
      const invalidConfig: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "test",
            enabled: true,
            match: { in: {}, out: { symbol: "USDC" } },
            fee: { type: "bps", bps: 10, recipient: "fees.near" },
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

describe("calculateFee", () => {
  it("calculates fee from string amount", () => {
    // 1000000 (1 USDC with 6 decimals) * 20 bps (0.20%) = 2000
    expect(calculateFee("1000000", 20)).toBe("2000");
  });

  it("calculates fee from bigint amount", () => {
    expect(calculateFee(1000000n, 20)).toBe("2000");
  });

  it("calculates 1% fee (100 bps)", () => {
    // 1000000 * 100 / 10000 = 10000
    expect(calculateFee("1000000", 100)).toBe("10000");
  });

  it("calculates 0.01% fee (1 bps)", () => {
    // 1000000 * 1 / 10000 = 100
    expect(calculateFee("1000000", 1)).toBe("100");
  });

  it("handles large amounts", () => {
    // 1000000000000000000 (1 ETH with 18 decimals) * 25 bps = 2500000000000000
    expect(calculateFee("1000000000000000000", 25)).toBe("2500000000000000");
  });

  it("returns 0 for 0 bps", () => {
    expect(calculateFee("1000000", 0)).toBe("0");
  });

  it("truncates fractional results (rounds down)", () => {
    // 100 * 3 / 10000 = 0.03 -> 0
    expect(calculateFee("100", 3)).toBe("0");
    // 10000 * 3 / 10000 = 3
    expect(calculateFee("10000", 3)).toBe("3");
  });
});

describe("calculateAmountAfterFee", () => {
  it("calculates amount after fee from string", () => {
    // 1000000 - (1000000 * 20 / 10000) = 1000000 - 2000 = 998000
    expect(calculateAmountAfterFee("1000000", 20)).toBe("998000");
  });

  it("calculates amount after fee from bigint", () => {
    expect(calculateAmountAfterFee(1000000n, 20)).toBe("998000");
  });

  it("calculates amount after 1% fee", () => {
    // 1000000 - 10000 = 990000
    expect(calculateAmountAfterFee("1000000", 100)).toBe("990000");
  });

  it("returns full amount for 0 bps", () => {
    expect(calculateAmountAfterFee("1000000", 0)).toBe("1000000");
  });

  it("handles large amounts", () => {
    // 1000000000000000000 - 2500000000000000 = 997500000000000000
    expect(calculateAmountAfterFee("1000000000000000000", 25)).toBe("997500000000000000");
  });
});
