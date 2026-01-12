# intents-1click-rule-engine

Fee configuration rule engine for NEAR Intents 1Click API. Matches swap requests against configurable rules to determine fees.

## Installation

```bash
bun add intents-1click-rule-engine
```

## Usage

```typescript
import { RuleEngine } from "intents-1click-rule-engine";

const feeConfig = {
  version: "1.0.0",
  default_fee: { type: "bps", bps: 20 },
  rules: [
    {
      id: "usdc-swaps",
      enabled: true,
      priority: 100,
      match: {
        in: { symbol: "USDC", blockchain: "*" },
        out: { symbol: "USDC", blockchain: "*" },
      },
      fee: { type: "bps", bps: 10 },
    },
  ],
};

// Validate config
const validation = RuleEngine.validate(feeConfig);
if (!validation.valid) {
  console.error(validation.errors);
  process.exit(1);
}

// Create engine (token registry defaults to 1click API with 1hr cache)
const engine = new RuleEngine({ feeConfig });

// Initialize token registry
await engine.initialize();

// Match a swap request
const result = engine.match({
  originAsset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
  destinationAsset: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
});

console.log(result.matched);    // true
console.log(result.fee.bps);    // 10
console.log(result.rule?.id);   // "usdc-swaps"
```

## Rule Matching

Rules are evaluated by priority (highest first). Each rule can match on:

- `assetId` - exact asset identifier
- `blockchain` - chain identifier (e.g., "eth", "polygon")
- `symbol` - token symbol (e.g., "USDC", "WBTC")

Use `"*"` as wildcard for `blockchain` or `symbol`.

## Development

```bash
bun install
bun test
bun run typecheck
```
