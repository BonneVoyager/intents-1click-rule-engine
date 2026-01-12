import { describe, it, expect } from "bun:test";
import { validateConfig } from "./validator";
import type { FeeConfig } from "./types";

describe("validateConfig", () => {
  it("validates a correct config", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: {
            in: { symbol: "USDC" },
            out: { symbol: "USDC" },
          },
          fee: { type: "bps", bps: 10, recipient: "fees.near" },
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
      default_fee: { type: "bps", bps: -10, recipient: "fees.near" },
      rules: [],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "default_fee.bps")).toBe(true);
  });

  it("requires at least one identifier in match.in", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: {
            in: {},
            out: { symbol: "USDC" },
          },
          fee: { type: "bps", bps: 10, recipient: "fees.near" },
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

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Duplicate"))).toBe(true);
  });

  it("validates priority is non-negative", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          priority: -5,
          match: {
            in: { symbol: "USDC" },
            out: { symbol: "USDC" },
          },
          fee: { type: "bps", bps: 10, recipient: "fees.near" },
        },
      ],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "rules[0].priority")).toBe(true);
  });

  it("requires rule id", () => {
    const config = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20 },
      rules: [
        {
          enabled: true,
          match: { in: { symbol: "USDC" }, out: { symbol: "USDC" } },
          fee: { type: "bps", bps: 10 },
        },
      ],
    } as unknown as FeeConfig;

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "rules[0].id")).toBe(true);
  });

  it("requires rule enabled field", () => {
    const config = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20 },
      rules: [
        {
          id: "test-rule",
          match: { in: { symbol: "USDC" }, out: { symbol: "USDC" } },
          fee: { type: "bps", bps: 10 },
        },
      ],
    } as unknown as FeeConfig;

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "rules[0].enabled")).toBe(true);
  });

  it("requires rule match object", () => {
    const config = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20 },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          fee: { type: "bps", bps: 10 },
        },
      ],
    } as unknown as FeeConfig;

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "rules[0].match")).toBe(true);
  });

  it("requires rule fee object", () => {
    const config = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20 },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: { in: { symbol: "USDC" }, out: { symbol: "USDC" } },
        },
      ],
    } as unknown as FeeConfig;

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "rules[0].fee")).toBe(true);
  });

  it("validates rule fee.bps is non-negative", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: { in: { symbol: "USDC" }, out: { symbol: "USDC" } },
          fee: { type: "bps", bps: -5, recipient: "fees.near" },
        },
      ],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "rules[0].fee.bps")).toBe(true);
  });

  it("requires match.out", () => {
    const config = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20 },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: { in: { symbol: "USDC" } },
          fee: { type: "bps", bps: 10 },
        },
      ],
    } as unknown as FeeConfig;

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "rules[0].match.out")).toBe(true);
  });

  it("requires at least one identifier in match.out", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: {
            in: { symbol: "USDC" },
            out: {},
          },
          fee: { type: "bps", bps: 10, recipient: "fees.near" },
        },
      ],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "rules[0].match.out")).toBe(true);
  });

  it("requires default_fee.recipient", () => {
    const config = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20 },
      rules: [],
    } as unknown as FeeConfig;

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "default_fee.recipient")).toBe(true);
  });

  it("requires rule fee.recipient", () => {
    const config = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: { in: { symbol: "USDC" }, out: { symbol: "USDC" } },
          fee: { type: "bps", bps: 10 },
        },
      ],
    } as unknown as FeeConfig;

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "rules[0].fee.recipient")).toBe(true);
  });

  it("validates default_fee.recipient is valid NEAR account", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "INVALID-NEAR-ACCOUNT" },
      rules: [],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "default_fee.recipient")).toBe(true);
  });

  it("validates rule fee.recipient is valid NEAR account", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: { in: { symbol: "USDC" }, out: { symbol: "USDC" } },
          fee: { type: "bps", bps: 10, recipient: "Invalid Account!" },
        },
      ],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "rules[0].fee.recipient")).toBe(true);
  });

  it("accepts valid NEAR implicit account (64 hex chars)", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" },
      rules: [],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it("accepts valid NEAR named accounts", () => {
    const validAccounts = ["fees.near", "sub.account.near", "my-account.testnet", "a1_2.near"];
    for (const account of validAccounts) {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: account },
        rules: [],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    }
  });

  it("accepts array of fee objects", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: [
        { type: "bps", bps: 14, recipient: "fees.near" },
        { type: "bps", bps: 6, recipient: "partner.near" },
      ],
      rules: [],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it("rejects empty fee array", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: [],
      rules: [],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("must not be empty"))).toBe(true);
  });

  it("rejects fee array with invalid NEAR account", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: [
        { type: "bps", bps: 10, recipient: "INVALID!" },
        { type: "bps", bps: 10, recipient: "partner.near" },
      ],
      rules: [],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("default_fee[0].recipient"))).toBe(true);
  });

  it("rejects fee array with negative bps", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: [
        { type: "bps", bps: -5, recipient: "fees.near" },
        { type: "bps", bps: 10, recipient: "partner.near" },
      ],
      rules: [],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("default_fee[0].bps"))).toBe(true);
  });

  it("accepts single fee in array", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: [{ type: "bps", bps: 20, recipient: "fees.near" }],
      rules: [],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it("accepts rule with array of fees", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: { in: { symbol: "USDC" }, out: { symbol: "USDC" } },
          fee: [
            { type: "bps", bps: 6, recipient: "fees.near" },
            { type: "bps", bps: 4, recipient: "partner.near" },
          ],
        },
      ],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it("validates each fee in array independently", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: [
        { type: "bps", bps: 10, recipient: "fees.near" },
        { type: "bps", bps: -5, recipient: "INVALID!" },
      ],
      rules: [],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "default_fee[1].bps")).toBe(true);
    expect(result.errors.some((e) => e.path === "default_fee[1].recipient")).toBe(true);
  });

  it("rejects empty blockchain array in matcher", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: {
            in: { blockchain: [] },
            out: { symbol: "USDC" },
          },
          fee: { type: "bps", bps: 10, recipient: "fees.near" },
        },
      ],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("blockchain array must not be empty"))).toBe(true);
  });

  it("rejects empty symbol array in matcher", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: {
            in: { symbol: [] },
            out: { symbol: "USDC" },
          },
          fee: { type: "bps", bps: 10, recipient: "fees.near" },
        },
      ],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("symbol array must not be empty"))).toBe(true);
  });

  it("rejects empty assetId array in matcher", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: {
            in: { assetId: [] },
            out: { symbol: "USDC" },
          },
          fee: { type: "bps", bps: 10, recipient: "fees.near" },
        },
      ],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("assetId array must not be empty"))).toBe(true);
  });

  it("rejects empty strings in blockchain array", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: {
            in: { blockchain: ["eth", "", "base"] },
            out: { symbol: "USDC" },
          },
          fee: { type: "bps", bps: 10, recipient: "fees.near" },
        },
      ],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("must not contain empty strings"))).toBe(true);
  });

  it("accepts assetId as array", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: {
            in: { assetId: ["asset1", "asset2"] },
            out: { symbol: "USDC" },
          },
          fee: { type: "bps", bps: 10, recipient: "fees.near" },
        },
      ],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it("rejects bps exceeding maximum of 10000", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 10001, recipient: "fees.near" },
      rules: [],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "default_fee.bps" && e.message.includes("exceeds maximum"))).toBe(true);
  });

  it("rejects rule fee bps exceeding maximum of 10000", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: { in: { symbol: "USDC" }, out: { symbol: "USDC" } },
          fee: { type: "bps", bps: 15000, recipient: "fees.near" },
        },
      ],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "rules[0].fee.bps" && e.message.includes("exceeds maximum"))).toBe(true);
  });

  it("accepts maximum valid bps of 10000", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 10000, recipient: "fees.near" },
      rules: [],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it("rejects invalid valid_from date string", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: { in: { symbol: "USDC" }, out: { symbol: "USDC" } },
          fee: { type: "bps", bps: 10, recipient: "fees.near" },
          valid_from: "not-a-valid-date",
        },
      ],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "rules[0].valid_from" && e.message.includes("not a valid date string"))).toBe(true);
  });

  it("rejects invalid valid_until date string", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: { in: { symbol: "USDC" }, out: { symbol: "USDC" } },
          fee: { type: "bps", bps: 10, recipient: "fees.near" },
          valid_until: "garbage-date",
        },
      ],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "rules[0].valid_until" && e.message.includes("not a valid date string"))).toBe(true);
  });

  it("accepts valid ISO 8601 date strings", () => {
    const config: FeeConfig = {
      version: "1.0.0",
      default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
      rules: [
        {
          id: "test-rule",
          enabled: true,
          match: { in: { symbol: "USDC" }, out: { symbol: "USDC" } },
          fee: { type: "bps", bps: 10, recipient: "fees.near" },
          valid_from: "2024-01-01T00:00:00.000Z",
          valid_until: "2024-12-31T23:59:59.999Z",
        },
      ],
    };

    const result = validateConfig(config);
    expect(result.valid).toBe(true);
  });

  it("accepts valid date strings in various formats", () => {
    const validDates = [
      "2024-01-01",
      "2024-01-01T12:00:00",
      "2024-01-01T12:00:00Z",
      "2024-01-01T12:00:00.000Z",
      "January 1, 2024",
    ];

    for (const dateStr of validDates) {
      const config: FeeConfig = {
        version: "1.0.0",
        default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
        rules: [
          {
            id: "test-rule",
            enabled: true,
            match: { in: { symbol: "USDC" }, out: { symbol: "USDC" } },
            fee: { type: "bps", bps: 10, recipient: "fees.near" },
            valid_from: dateStr,
          },
        ],
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    }
  });
});
