import { describe, it, expect } from "bun:test";
import { validateConfig } from "./validator";
import type { FeeConfig } from "./types";

describe("validateConfig", () => {
  it("validates a correct config", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20 },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: {
            in: { symbol: "USDC" },
            out: { symbol: "USDC" },
          },
          fee: { type: "bps", bps: 10 },
        },
      ],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("requires version", () => {
    const config = {
      default_fee: { type: "bps", bps: 20 },
      rules: [],
    } as unknown as FeeConfig;

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "version")).toBe(true);
  });

  it("requires default_fee", () => {
    const config = {
      version: "1.0.0",
      rules: [],
    } as unknown as FeeConfig;

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "default_fee")).toBe(true);
  });

  it("validates default_fee.bps is non-negative", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: -10 },
      rules: [],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "default_fee.bps")).toBe(true);
  });

  it("requires at least one identifier in match.in", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20 },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: {
            in: {},
            out: { symbol: "USDC" },
          },
          fee: { type: "bps", bps: 10 },
        },
      ],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "rules[0].match.in")).toBe(true);
  });

  it("detects duplicate rule ids", () => {
    const config: FeeConfig = {
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

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Duplicate"))).toBe(true);
  });

  it("validates priority is non-negative", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20 },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          priority: -5,
          match: {
            in: { symbol: "USDC" },
            out: { symbol: "USDC" },
          },
          fee: { type: "bps", bps: 10 },
        },
      ],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "rules[0].priority")).toBe(true);
  });
});
