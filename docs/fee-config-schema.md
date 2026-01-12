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
| `min` | string | Minimum input amount in base token units | `"1000000"` (1 USDC with 6 decimals) |
| `max` | string | Maximum input amount in base token units | `"1000000000"` (1000 USDC with 6 decimals) |

**Constraints:**
1. All properties are optional, but **at least one** of `blockchain`, `symbol`, or `assetId` must be defined in each `in`/`out` block
2. Token information is sourced from: `https://1click.chaindefuser.com/v0/tokens`
3. Amount values (`min`/`max`) refer to the **input amount** in base units (accounting for token decimals)
4. Use `"*"` as a wildcard to match any value for that property

**Important:** The `min` and `max` fields only apply to the **input amount** (`in` side of the swap), not the output amount.

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

### Amount Constraints

- `min` and `max` apply only to the **input amount** (the `in` side)
- Ranges are inclusive: `min <= input_amount <= max`
- If only `min` is specified: `input_amount >= min`
- If only `max` is specified: `input_amount <= max`
- Amounts are in base token units (e.g., USDC with 6 decimals: `"1000000"` = 1 USDC)

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

### Example 2: Specific Asset Pair with Amount Constraints

```json
{
  "id": "usdc-wbtc-eth-swaps",
  "enabled": true,
  "priority": 90,
  "match": {
    "in": {
      "assetId": "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
      "min": "1000000",
      "max": "1000000000"
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

**Applies to:** USDC (Ethereum) → WBTC (Ethereum) swaps where:
- Input amount is between 1 USDC and 1,000 USDC
- Uses exact asset IDs for precision

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
      "match": {
        "in": {
          "assetId": "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near",
          "min": "1000000",
          "max": "1000000000"
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
4. **Valid amounts:** `min` and `max` must be valid numeric strings
5. **Amount ordering:** If both specified, `min` must be ≤ `max`
6. **Valid BPS:** Basis points must be non-negative numbers
7. **Amount placement:** `min` and `max` should only appear in the `in` block (input side)

### Recommended Validations

1. **Asset ID format:** Validate against known asset ID patterns from token registry
2. **Blockchain names:** Validate against supported blockchain identifiers
3. **Token symbols:** Check against token registry for existence
4. **Decimal precision:** Ensure `min`/`max` values respect token decimal places
5. **Wildcard usage:** Ensure `"*"` is only used for `blockchain` and `symbol`, not `assetId`

## Token Registry Reference

Token information (blockchain names, symbols, asset IDs, decimals) is sourced from:

**Endpoint:** `https://1click.chaindefuser.com/v0/tokens`

This endpoint provides:
- Valid blockchain identifiers
- Token symbols and their associated blockchains
- Asset ID formats
- Token decimal precision (for amount calculations)

## Implementation Notes

### For Rule Engine Developers

1. **Caching:** Consider caching token registry data for performance
2. **Validation:** Validate configuration on load, not on every swap evaluation
3. **Performance:** Index rules by priority for O(1) priority-based lookup
4. **Logging:** Log which rule matched for debugging and analytics
5. **Decimal handling:** Use arbitrary precision libraries for amount comparisons
6. **Amount scope:** Remember that `min`/`max` only apply to the input amount, not output

### For Configuration Managers

1. **Testing:** Test rule precedence thoroughly, especially with overlapping patterns
2. **Priority gaps:** Use priority gaps (100, 200, 300) to allow insertion of rules later
3. **Disable vs Delete:** Use `"enabled": false` instead of deleting rules for audit trails
4. **Documentation:** Always include `description` field for future reference
5. **Amount constraints:** Only specify `min`/`max` in the `in` block for input amount filtering

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

**Pattern 3: Large swap incentive**
```json
{
  "match": {
    "in": {
      "symbol": "USDC",
      "min": "100000000000"
    },
    "out": { "symbol": "*" }
  }
}
```
Discounted fee for swaps with 100,000+ USDC input.

**Pattern 4: Exact pair optimization**
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

### Amount Edge Cases

```json
// Only min specified
{ "in": { "symbol": "USDC", "min": "1000000" } }
// Matches: 1 USDC, 10 USDC, 1000000 USDC, etc.

// Only max specified
{ "in": { "symbol": "USDC", "max": "1000000" } }
// Matches: 0.01 USDC, 0.5 USDC, 1 USDC

// Both specified
{ "in": { "symbol": "USDC", "min": "1000000", "max": "1000000000" } }
// Matches: 1 USDC to 1000 USDC (inclusive)
```

## Future Enhancements (Not Currently Supported)

These features may be added in future schema versions:

- **Bidirectional matching:** Single rule for A↔B swaps
- **Array values:** `"blockchain": ["ethereum", "polygon"]`
- **Negation:** `"blockchain": "!near"` (everything except NEAR)
- **Output amount constraints:** `min`/`max` on the `out` side
- **Time-based rules:** `valid_from` and `valid_until` timestamps
- **Fee caps:** `min_absolute` and `max_absolute` fee limits
- **Alternative fee types:** Flat fees, tiered fees, formula-based fees
- **Metadata:** `created_at`, `created_by`, `tags`, etc.
- **Conditional logic:** AND/OR combinations of conditions

## Version History

- **1.0.0** (Initial release)
  - Basic rule matching on blockchain, symbol, assetId
  - Input amount constraints (min/max)
  - Priority-based rule evaluation
  - BPS-based fee calculation
  - Wildcard support with `"*"`
