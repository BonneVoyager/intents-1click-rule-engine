# Fee Configuration Schema

**Version:** 1.0.0  
**Purpose:** Fee configuration schema for NEAR Intents 1Click API

## Overview

This schema defines fee rules for cross-chain token swaps. It supports a default fee structure with customizable rules based on blockchain, token symbol, asset ID, and swap amount constraints.

## Schema Structure

```json
{
  "version": "1.0.0",
  "default_fee": { /* ... */ },
  "rules": [ /* ... */ ]
}
```

## Top-Level Fields

### `version` (required)
- **Type:** `string`
- **Format:** Semantic versioning (e.g., `"1.0.0"`)
- **Description:** Schema version identifier

### `default_fee` (required)
- **Type:** `object`
- **Description:** Default fee applied when no rules match

#### `default_fee` Properties
- `type` (required): Fee calculation type. Currently only supports `"bps"`
- `bps` (required): Basis points (1 bps = 0.01% = 0.0001). Example: `20` = 0.20% fee

```json
"default_fee": {
  "type": "bps",
  "bps": 20
}
```

### `rules` (required)
- **Type:** `array`
- **Description:** Ordered list of fee rules evaluated by priority

## Rule Object

Each rule in the `rules` array has the following structure:

### Rule Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string | Yes | - | Unique identifier for the rule |
| `enabled` | boolean | Yes | - | Whether the rule is active |
| `priority` | number | No | 100 | Rule evaluation priority (higher = evaluated first) |
| `description` | string | No | - | Human-readable description of the rule |
| `match` | object | Yes | - | Matching criteria for when this rule applies |
| `fee` | object | Yes | - | Fee configuration when rule matches |

### `match` Object

Defines when a rule applies based on swap characteristics.

```json
"match": {
  "in": { /* input token criteria */ },
  "out": { /* output token criteria */ }
}
```

Both `in` and `out` support the following optional properties:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `blockchain` | string | Blockchain identifier or `"*"` for any blockchain | `"ethereum"`, `"polygon"`, `"*"` |
| `symbol` | string | Token symbol or `"*"` for any token | `"USDC"`, `"WBTC"`, `"*"` |
| `assetId` | string | Exact asset identifier from token registry | `"nep141:eth-0xa0b8...omft.near"` |

**Constraints:**
1. All properties are optional, but **at least one** of `blockchain`, `symbol`, or `assetId` must be defined in each `in`/`out` block
2. Token information is sourced from: `https://1click.chaindefuser.com/v0/tokens`
3. Use `"*"` as a wildcard to match any value for that property

**Important:** Rules match based on token identifiers only (blockchain, symbol, assetId), not on swap amounts.

### `fee` Object

Defines the fee when a rule matches.

```json
"fee": {
  "type": "bps",
  "bps": 10
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | string | Yes | Fee calculation type (currently only `"bps"` supported) |
| `bps` | number | Yes (when type=bps) | Basis points for the fee |

## Rule Evaluation Logic

### Priority and Matching Order

1. Rules are evaluated in **priority order** (highest priority first)
2. If priorities are equal, rules are evaluated in **array order** (first to last)
3. The **first matching rule** is applied
4. If no rules match, the `default_fee` is applied

### Wildcard Matching

- `"*"` matches any value for that property
- Example: `"blockchain": "*"` matches all blockchains
- Wildcard rules are less specific than exact matches

## Complete Examples

### Example 1: Reduced Fee for USDC Swaps

```json
{
  "id": "usdc-swaps-half-fee",
  "enabled": true,
  "priority": 100,
  "description": "Reduced fees for USDC swaps across all blockchains",
  "match": {
    "in": {
      "blockchain": "*",
      "symbol": "USDC"
    },
    "out": {
      "blockchain": "*",
      "symbol": "USDC"
    }
  },
  "fee": {
    "type": "bps",
    "bps": 10
  }
}
```

**Applies to:** Any USDC → USDC swap on any blockchain pair  
**Fee:** 10 bps (0.10%)

### Example 2: Specific Asset Pair

```json
{
  "id": "usdc-wbtc-eth-swaps",
  "enabled": true,
  "priority": 90,
  "description": "Special fee for USDC to WBTC swaps on Ethereum",
  "match": {
    "in": {
      "assetId": "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near"
    },
    "out": {
      "assetId": "nep141:eth-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.omft.near"
    }
  },
  "fee": {
    "type": "bps",
    "bps": 10
  }
}
```

**Applies to:** USDC (Ethereum) → WBTC (Ethereum) swaps using exact asset IDs

**Fee:** 10 bps (0.10%)

### Example 3: Blockchain-Specific Rule

```json
{
  "id": "ethereum-to-polygon-discounted",
  "enabled": true,
  "priority": 110,
  "description": "Discounted fees for Ethereum to Polygon swaps",
  "match": {
    "in": {
      "blockchain": "ethereum"
    },
    "out": {
      "blockchain": "polygon"
    }
  },
  "fee": {
    "type": "bps",
    "bps": 15
  }
}
```

**Applies to:** Any token swap from Ethereum to Polygon  
**Fee:** 15 bps (0.15%)

### Example 4: Complete Configuration

```json
{
  "version": "1.0.0",
  "default_fee": {
    "type": "bps",
    "bps": 20
  },
  "rules": [
    {
      "id": "usdc-swaps-half-fee",
      "enabled": true,
      "priority": 100,
      "description": "Reduced fees for USDC swaps",
      "match": {
        "in": {
          "blockchain": "*",
          "symbol": "USDC"
        },
        "out": {
          "blockchain": "*",
          "symbol": "USDC"
        }
      },
      "fee": {
        "type": "bps",
        "bps": 10
      }
    },
    {
      "id": "usdc-wbtc-eth-swaps",
      "enabled": true,
      "priority": 90,
      "description": "Special fee for USDC to WBTC swaps on Ethereum",
      "match": {
        "in": {
          "assetId": "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near"
        },
        "out": {
          "assetId": "nep141:eth-0x2260fac5e5542a773aa44fbcfedf7c193bc2c599.omft.near"
        }
      },
      "fee": {
        "type": "bps",
        "bps": 10
      }
    }
  ]
}
```

## Validation Rules

### Required Validations

1. **Unique IDs:** Each rule must have a unique `id`
2. **Valid priorities:** Priority must be a non-negative number
3. **Match constraints:** At least one of `blockchain`, `symbol`, or `assetId` must be present in both `in` and `out`
4. **Valid BPS:** Basis points must be non-negative numbers

### Recommended Validations

1. **Asset ID format:** Validate against known asset ID patterns from token registry
2. **Blockchain names:** Validate against supported blockchain identifiers
3. **Token symbols:** Check against token registry for existence
4. **Wildcard usage:** Ensure `"*"` is only used for `blockchain` and `symbol`, not `assetId`

## Token Registry Reference

Token information (blockchain names, symbols, asset IDs, decimals) is sourced from:

**Endpoint:** `https://1click.chaindefuser.com/v0/tokens` (configurable)

This endpoint returns an array of token objects with the following structure:

```json
{
  "assetId": "nep141:eth-0xd9c2d319cd7e6177336b0a9c93c21cb48d84fb54.omft.near",
  "decimals": 18,
  "blockchain": "eth",
  "symbol": "HAPI",
  "price": 0.467292,
  "priceUpdatedAt": "2026-01-12T13:22:38.411Z",
  "contractAddress": "0xd9c2d319cd7e6177336b0a9c93c21cb48d84fb54"
}
```

**Token Object Fields:**
- `assetId`: Unique identifier for the asset (used in rules)
- `decimals`: Number of decimal places for the token
- `blockchain`: Blockchain identifier (e.g., `"eth"`, `"polygon"`, `"arb"`, `"sol"`)
- `symbol`: Token symbol (e.g., `"USDC"`, `"WBTC"`, `"HAPI"`)
- `price`: Current USD price (optional, for analytics)
- `priceUpdatedAt`: Last price update timestamp
- `contractAddress`: Token contract address on its native chain

**Caching Requirements:**
- Token registry data must be cached for **1 hour** after fetching
- The endpoint URL must be **configurable** (in case it changes)
- Cache must be refreshed before any validation if expired

## Implementation Notes

### For Rule Engine Developers

1. **Token Registry Caching:**
   - Fetch token list from configurable endpoint URL
   - Cache for exactly 1 hour
   - Refresh cache before validation if expired
   - Build lookup maps for fast access:
     ```javascript
     {
       byAssetId: Map<assetId, tokenInfo>,
       byBlockchainSymbol: Map<`${blockchain}:${symbol}`, tokenInfo[]>
     }
     ```

2. **Validation:** Validate configuration on load, not on every swap evaluation
3. **Performance:** Index rules by priority for O(1) priority-based lookup
4. **Logging:** Log which rule matched for debugging and analytics

### Quote Request Integration

The rule engine receives quote requests with the following structure:

```json
{
  "originAsset": "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
  "destinationAsset": "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near",
  "amount": "1000",
  // ... other fields
}
```

**Processing Steps:**

1. **Map request to rule matching:**
   ```
   originAsset → in.assetId
   destinationAsset → out.assetId
   ```

2. **Resolve asset details from token registry:**
   ```
   originAsset → {blockchain: "arb", symbol: "USDC", decimals: 6}
   destinationAsset → {blockchain: "sol", symbol: "USDC", decimals: 6}
   ```

3. **Evaluate rules:**
   - Check each enabled rule by priority (highest first)
   - For each rule, match against:
     - `in.assetId` vs `originAsset`
     - `in.blockchain` vs origin token's blockchain
     - `in.symbol` vs origin token's symbol
     - `out.assetId` vs `destinationAsset`
     - `out.blockchain` vs destination token's blockchain
     - `out.symbol` vs destination token's symbol
   
4. **Return matched rule:**
   ```json
   {
     "matchedRule": {
       "id": "usdc-swaps-half-fee",
       "priority": 100,
       "fee": {
         "type": "bps",
         "bps": 10
       }
     },
     "calculatedFee": {
       "bps": 10,
       "percentage": 0.10
     }
   }
   ```

**Example Matching Flow:**

```javascript
// Quote request
{
  "originAsset": "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
  "destinationAsset": "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
  "amount": "5000000"  // 5 USDC (6 decimals)
}

// Token registry lookup
originToken = {
  assetId: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
  blockchain: "eth",
  symbol: "USDC",
  decimals: 6
}

destinationToken = {
  assetId: "nep141:polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174.omft.near",
  blockchain: "polygon",
  symbol: "USDC",
  decimals: 6
}

// Rule matching
Rule: {
  match: {
    in: { blockchain: "*", symbol: "USDC" },
    out: { blockchain: "*", symbol: "USDC" }
  },
  fee: { type: "bps", bps: 10 }
}

// Result: MATCHED
// Return: { matchedRule: {...}, calculatedFee: { bps: 10 } }
```

### For Configuration Managers

1. **Testing:** Test rule precedence thoroughly, especially with overlapping patterns
2. **Priority gaps:** Use priority gaps (100, 200, 300) to allow insertion of rules later
3. **Disable vs Delete:** Use `"enabled": false` instead of deleting rules for audit trails
4. **Documentation:** Always include `description` field for future reference

### Configuration Requirements

```javascript
{
  "tokenRegistryUrl": "https://1click.chaindefuser.com/v0/tokens",
  "tokenRegistryCacheTtl": 3600,  // 1 hour in seconds
  "feeConfigPath": "./fee-config.json"
}
```

### Common Patterns

**Pattern 1: Symbol-based discount**
```json
{
  "match": {
    "in": { "symbol": "USDC" },
    "out": { "symbol": "*" }
  }
}
```
Matches any swap FROM USDC to any token.

**Pattern 2: Cross-chain routing**
```json
{
  "match": {
    "in": { "blockchain": "ethereum" },
    "out": { "blockchain": "polygon" }
  }
}
```
Matches any Ethereum → Polygon swap regardless of tokens.

**Pattern 3: Exact pair optimization**
```json
{
  "match": {
    "in": { "assetId": "nep141:eth-0xabc...near" },
    "out": { "assetId": "nep141:polygon-0xdef...near" }
  }
}
```
Specific fee for exact asset pair routing.

## Edge Cases and Considerations

### Overlapping Rules

When multiple rules could match a swap:
```json
// Rule 1 (priority: 100): USDC → * = 10 bps
// Rule 2 (priority: 90): USDC → WBTC = 5 bps
```

For a USDC → WBTC swap:
- Rule 1 matches (higher priority)
- Rule 2 is never evaluated
- Result: 10 bps fee

**Solution:** Give more specific rules higher priority.

### Wildcard Specificity

```json
// Less specific (matches more swaps)
{ "in": { "blockchain": "*" } }

// More specific (matches fewer swaps)
{ "in": { "blockchain": "ethereum", "symbol": "USDC" } }

// Most specific (matches exact asset)
{ "in": { "assetId": "nep141:eth-0x..." } }
```

## Future Enhancements (Not Currently Supported)

These features may be added in future schema versions:

- **Bidirectional matching:** Single rule for A↔B swaps
- **Array values:** `"blockchain": ["ethereum", "polygon"]`
- **Negation:** `"blockchain": "!near"` (everything except NEAR)
- **Time-based rules:** `valid_from` and `valid_until` timestamps
- **Alternative fee types:** Flat fees, tiered fees, formula-based fees
- **Metadata:** `created_at`, `created_by`, `tags`, etc.
- **Conditional logic:** AND/OR combinations of conditions

## API Integration

### Quote Request Endpoint

**URL:** `POST https://1click.chaindefuser.com/v0/quote`

**Headers:**
```
Authorization: Bearer YOUR_SECRET_TOKEN
Content-Type: application/json
Accept: */*
```

**Request Body:**
```json
{
  "dry": true,
  "depositMode": "SIMPLE",
  "swapType": "EXACT_INPUT",
  "slippageTolerance": 100,
  "originAsset": "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
  "depositType": "ORIGIN_CHAIN",
  "destinationAsset": "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near",
  "amount": "1000",
  "refundTo": "0x2527D02599Ba641c19FEa793cD0F167589a0f10D",
  "refundType": "ORIGIN_CHAIN",
  "recipient": "13QkxhNMrTPxoCkRdYdJ65tFuwXPhL5gLS2Z5Nr6gjRK",
  "connectedWallets": ["0x123...", "0x456..."],
  "sessionId": "session_abc123",
  "virtualChainRecipient": "0xb4c2fbec9d610F9A3a9b843c47b1A8095ceC887C",
  "virtualChainRefundRecipient": "0xb4c2fbec9d610F9A3a9b843c47b1A8095ceC887C",
  "customRecipientMsg": "smart-contract-recipient.near",
  "recipientType": "DESTINATION_CHAIN",
  "deadline": "2019-08-24T14:15:22Z",
  "referral": "referral",
  "quoteWaitingTimeMs": 3000,
  "appFees": [
    {
      "recipient": "recipient.near",
      "fee": 100
    }
  ]
}
```

**Relevant Fields for Fee Matching:**
- `originAsset`: Maps to `in.assetId` in fee rules
- `destinationAsset`: Maps to `out.assetId` in fee rules

### Rule Engine Output

When a rule matches, the engine should return:

```json
{
  "matched": true,
  "rule": {
    "id": "usdc-swaps-half-fee",
    "priority": 100,
    "description": "Reduced fees for USDC swaps"
  },
  "fee": {
    "type": "bps",
    "bps": 10
  },
  "matchDetails": {
    "originToken": {
      "assetId": "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
      "blockchain": "arb",
      "symbol": "USDC",
      "decimals": 6
    },
    "destinationToken": {
      "assetId": "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near",
      "blockchain": "sol",
      "symbol": "USDC",
      "decimals": 6
    },
    "inputAmount": "1000"
  }
}
```

**When no rule matches:**
```json
{
  "matched": false,
  "fee": {
    "type": "bps",
    "bps": 20
  },
  "defaultFeeApplied": true
}
```

## Version History

### Quote Request Endpoint

**URL:** `POST https://1click.chaindefuser.com/v0/quote`

**Headers:**
```
Authorization: Bearer YOUR_SECRET_TOKEN
Content-Type: application/json
Accept: */*
```

**Request Body:**
```json
{
  "dry": true,
  "depositMode": "SIMPLE",
  "swapType": "EXACT_INPUT",
  "slippageTolerance": 100,
  "originAsset": "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
  "depositType": "ORIGIN_CHAIN",
  "destinationAsset": "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near",
  "amount": "1000",
  "refundTo": "0x2527D02599Ba641c19FEa793cD0F167589a0f10D",
  "refundType": "ORIGIN_CHAIN",
  "recipient": "13QkxhNMrTPxoCkRdYdJ65tFuwXPhL5gLS2Z5Nr6gjRK",
  "connectedWallets": ["0x123...", "0x456..."],
  "sessionId": "session_abc123",
  "virtualChainRecipient": "0xb4c2fbec9d610F9A3a9b843c47b1A8095ceC887C",
  "virtualChainRefundRecipient": "0xb4c2fbec9d610F9A3a9b843c47b1A8095ceC887C",
  "customRecipientMsg": "smart-contract-recipient.near",
  "recipientType": "DESTINATION_CHAIN",
  "deadline": "2019-08-24T14:15:22Z",
  "referral": "referral",
  "quoteWaitingTimeMs": 3000,
  "appFees": [
    {
      "recipient": "recipient.near",
      "fee": 100
    }
  ]
}
```

**Relevant Fields for Fee Matching:**
- `originAsset`: Maps to `in.assetId` in fee rules
- `destinationAsset`: Maps to `out.assetId` in fee rules

### Rule Engine Output

When a rule matches, the engine should return:

```json
{
  "matched": true,
  "rule": {
    "id": "usdc-swaps-half-fee",
    "priority": 100,
    "description": "Reduced fees for USDC swaps"
  },
  "fee": {
    "type": "bps",
    "bps": 10
  },
  "matchDetails": {
    "originToken": {
      "assetId": "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near",
      "blockchain": "arb",
      "symbol": "USDC",
      "decimals": 6
    },
    "destinationToken": {
      "assetId": "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near",
      "blockchain": "sol",
      "symbol": "USDC",
      "decimals": 6
    },
    "inputAmount": "1000"
  }
}
```

**When no rule matches:**
```json
{
  "matched": false,
  "fee": {
    "type": "bps",
    "bps": 20
  },
  "defaultFeeApplied": true
}
```

## Changelog

- **1.0.0** (Initial release)
  - Basic rule matching on blockchain, symbol, assetId
  - Priority-based rule evaluation
  - BPS-based fee calculation
  - Wildcard support with `"*"`
