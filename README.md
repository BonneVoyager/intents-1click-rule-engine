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

// Create engine (validates config, throws on error)
const engine = new RuleEngine(feeConfig);

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

// Calculate fee amount from bps
import { calculateFee } from "intents-1click-rule-engine";

const feeAmount = calculateFee("1000000", result.fee.bps); // "1000" (0.10% of 1000000)
```

## Token Registry

The engine fetches the token list from `https://1click.chaindefuser.com/v0/tokens` to resolve asset IDs to their `blockchain` and `symbol`. This allows rules to match by symbol/blockchain instead of exact asset IDs.

```
Swap Request                     Token Registry Lookup
─────────────                    ─────────────────────
originAsset: "nep141:eth-..."  → { blockchain: "eth", symbol: "USDC" }
destinationAsset: "nep141:sol-..." → { blockchain: "sol", symbol: "USDC" }
```

Call `engine.initialize()` before matching to fetch the token list. The list is cached for 1 hour by default.

## Rule Matching

Rules are evaluated by priority (highest first). The first matching rule wins. If no rules match, `default_fee` is used.

Each rule can match on:

- `assetId` - exact asset identifier
- `blockchain` - chain identifier (e.g., `"eth"`, `"polygon"`)
- `symbol` - token symbol (e.g., `"USDC"`, `"WBTC"`)

Special patterns:
- `"*"` - wildcard, matches any value
- `"!value"` - negation, matches anything except `value`
- `["a", "b"]` - array, matches any value in the list (OR logic)

## Rule Examples

### Match by symbol (any chain)

```typescript
{
  id: "usdc-to-usdc",
  enabled: true,
  priority: 100,
  match: {
    in: { symbol: "USDC" },
    out: { symbol: "USDC" },
  },
  fee: { type: "bps", bps: 10 },
}
```

### Match by blockchain route

```typescript
{
  id: "eth-to-polygon",
  enabled: true,
  priority: 100,
  match: {
    in: { blockchain: "eth" },
    out: { blockchain: "polygon" },
  },
  fee: { type: "bps", bps: 15 },
}
```

### Match exact asset pair

```typescript
{
  id: "eth-usdc-to-polygon-usdc",
  enabled: true,
  priority: 200,
  match: {
    in: { assetId: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near" },
    out: { assetId: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near" },
  },
  fee: { type: "bps", bps: 5 },
}
```

### Mixed matching (blockchain + symbol)

```typescript
{
  id: "eth-usdc-to-any-usdc",
  enabled: true,
  priority: 150,
  match: {
    in: { blockchain: "eth", symbol: "USDC" },
    out: { symbol: "USDC", blockchain: "*" },
  },
  fee: { type: "bps", bps: 8 },
}
```

### Wildcard for any token on specific chain

```typescript
{
  id: "anything-to-solana",
  enabled: true,
  priority: 50,
  match: {
    in: { blockchain: "*" },
    out: { blockchain: "sol" },
  },
  fee: { type: "bps", bps: 25 },
}
```

### Negation (exclude specific values)

```typescript
{
  id: "non-eth-swaps",
  enabled: true,
  priority: 100,
  match: {
    in: { blockchain: "!eth" },
    out: { blockchain: "!eth" },
  },
  fee: { type: "bps", bps: 12 },
}
```

### Array values (match multiple options)

```typescript
{
  id: "stablecoin-swaps",
  enabled: true,
  priority: 100,
  match: {
    in: { symbol: ["USDC", "USDT", "DAI"] },
    out: { symbol: ["USDC", "USDT", "DAI"] },
  },
  fee: { type: "bps", bps: 5 },
}
```

```typescript
{
  id: "l2-to-l2",
  enabled: true,
  priority: 100,
  match: {
    in: { blockchain: ["arb", "polygon", "base", "op"] },
    out: { blockchain: ["arb", "polygon", "base", "op"] },
  },
  fee: { type: "bps", bps: 8 },
}
```

### Time-based rules (promotional periods)

```typescript
{
  id: "new-year-promo",
  enabled: true,
  priority: 200,
  valid_from: "2025-01-01T00:00:00Z",
  valid_until: "2025-01-07T23:59:59Z",
  match: {
    in: { symbol: "*" },
    out: { symbol: "*" },
  },
  fee: { type: "bps", bps: 0 },
}
```

```typescript
{
  id: "summer-discount",
  enabled: true,
  priority: 150,
  valid_from: "2025-06-01T00:00:00Z",
  // No valid_until - runs indefinitely after start
  match: {
    in: { symbol: "USDC" },
    out: { symbol: "USDC" },
  },
  fee: { type: "bps", bps: 5 },
}
```

### Complete config example

```typescript
const feeConfig = {
  version: "1.0.0",
  default_fee: { type: "bps", bps: 30 },
  rules: [
    // Most specific first (higher priority)
    {
      id: "eth-usdc-to-polygon-usdc",
      enabled: true,
      priority: 200,
      match: {
        in: { assetId: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near" },
        out: { assetId: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near" },
      },
      fee: { type: "bps", bps: 5 },
    },
    // Chain + symbol combo
    {
      id: "eth-usdc-to-any",
      enabled: true,
      priority: 150,
      match: {
        in: { blockchain: "eth", symbol: "USDC" },
        out: { blockchain: "*" },
      },
      fee: { type: "bps", bps: 12 },
    },
    // All stablecoin swaps
    {
      id: "usdc-swaps",
      enabled: true,
      priority: 100,
      match: {
        in: { symbol: "USDC" },
        out: { symbol: "USDC" },
      },
      fee: { type: "bps", bps: 10 },
    },
    // Disabled rule (won't match)
    {
      id: "promo-free-swaps",
      enabled: false,
      priority: 300,
      match: {
        in: { blockchain: "*" },
        out: { blockchain: "*" },
      },
      fee: { type: "bps", bps: 0 },
    },
  ],
};
```

### Priority ordering

- Higher priority rules are evaluated first
- First matching rule wins
- Use priority gaps (50, 100, 150, 200) to allow inserting rules later
- More specific rules should have higher priority

## Development

```bash
bun install
bun test
bun run typecheck
```
