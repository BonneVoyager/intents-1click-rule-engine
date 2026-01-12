# intents-1click-rule-engine

Fee configuration rule engine for NEAR Intents 1Click API. Matches swap requests against configurable rules to determine fees.

## Installation

```bash
bun add intents-1click-rule-engine
```

## Usage

```typescript
import { RuleEngine, getTotalBps, calculateFee, type FeeConfig } from "intents-1click-rule-engine";

const feeConfig: FeeConfig = {
  version: "1.0.0",
  default_fee: { type: "bps", bps: 20, recipient: "fees.near" },
  rules: [
    {
      id: "usdc-swaps",
      enabled: true,
      priority: 100,
      match: {
        in: { symbol: "USDC", blockchain: "*" },
        out: { symbol: "USDC", blockchain: "*" },
      },
      fee: { type: "bps", bps: 10, recipient: "fees.near" },
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
  destinationAsset: "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
});

console.log(result.matched);           // true
console.log(result.fee);               // { type: "bps", bps: 10, recipient: "fees.near" }
console.log(result.rule?.id);          // "usdc-swaps"
console.log(getTotalBps(result.fee));  // 10

// Calculate fee amount
const feeAmount = calculateFee("1000000", getTotalBps(result.fee)); // "1000" (0.10% of 1000000)
```

## Token Registry

The engine fetches the token list from `https://1click.chaindefuser.com/v0/tokens` to resolve asset IDs to their `blockchain` and `symbol`. This allows rules to match by symbol/blockchain instead of exact asset IDs.

```
Swap Request                          Token Registry Lookup
─────────────                         ─────────────────────
originAsset: "nep141:eth-..."      → { blockchain: "eth", symbol: "USDC" }
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

## Fee Structure

Each fee requires a `type`, `bps`, and `recipient`. Fees can be a single object or an array for multiple recipients:

### Single fee

```typescript
fee: { type: "bps", bps: 20, recipient: "fees.near" }
```

### Multiple fees (split between recipients)

Each recipient can have their own fee amount:

```typescript
fee: [
  { type: "bps", bps: 14, recipient: "fees.near" },     // 0.14%
  { type: "bps", bps: 6, recipient: "partner.near" },   // 0.06%
]
// Total: 0.20%
```

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
  fee: { type: "bps", bps: 10, recipient: "fees.near" },
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
  fee: { type: "bps", bps: 15, recipient: "fees.near" },
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
    out: { assetId: "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near" },
  },
  fee: { type: "bps", bps: 5, recipient: "fees.near" },
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
  fee: { type: "bps", bps: 8, recipient: "fees.near" },
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
  fee: { type: "bps", bps: 25, recipient: "fees.near" },
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
  fee: { type: "bps", bps: 12, recipient: "fees.near" },
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
  fee: { type: "bps", bps: 5, recipient: "fees.near" },
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
  fee: { type: "bps", bps: 8, recipient: "fees.near" },
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
  fee: { type: "bps", bps: 0, recipient: "fees.near" },
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
  fee: { type: "bps", bps: 5, recipient: "fees.near" },
}
```

### Multiple fee recipients

Split fees between multiple accounts (e.g., platform + partner):

```typescript
{
  id: "partner-referral",
  enabled: true,
  priority: 100,
  match: {
    in: { symbol: "USDC" },
    out: { symbol: "USDC" },
  },
  fee: [
    { type: "bps", bps: 7, recipient: "fees.near" },
    { type: "bps", bps: 3, recipient: "partner.near" },
  ],
}
// Total fee: 10 bps (0.10%), split 70/30
```

### Complete config example

```typescript
const feeConfig = {
  version: "1.0.0",
  default_fee: { type: "bps", bps: 30, recipient: "fees.near" },
  rules: [
    // Most specific first (higher priority)
    {
      id: "eth-usdc-to-polygon-usdc",
      enabled: true,
      priority: 200,
      match: {
        in: { assetId: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near" },
        out: { assetId: "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near" },
      },
      fee: { type: "bps", bps: 5, recipient: "fees.near" },
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
      fee: { type: "bps", bps: 12, recipient: "fees.near" },
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
      fee: { type: "bps", bps: 10, recipient: "fees.near" },
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
      fee: { type: "bps", bps: 0, recipient: "fees.near" },
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

## Publishing to npm

### Prerequisites

1. Create an [npm account](https://www.npmjs.com/signup) if you don't have one
2. Login to npm:

```bash
npm login
```

### Publish

1. Update the version in `package.json`:

```bash
# Patch release (1.0.0 -> 1.0.1)
npm version patch

# Minor release (1.0.0 -> 1.1.0)
npm version minor

# Major release (1.0.0 -> 2.0.0)
npm version major
```

2. Run tests to ensure everything works:

```bash
bun test && bun run typecheck
```

3. Publish to npm:

```bash
npm publish
```

### Publishing a scoped package

If you want to publish under a scope (e.g., `@myorg/intents-1click-rule-engine`):

1. Update the `name` in `package.json`:

```json
{
  "name": "@myorg/intents-1click-rule-engine"
}
```

2. Publish with public access (scoped packages are private by default):

```bash
npm publish --access public
```

### Verify publication

After publishing, verify the package is available:

```bash
npm info intents-1click-rule-engine
```
