Below is a fee configuration schema for NEAR Intents 1Click API.

- `rules.match.in` and `rules.match.out` allow the following properties:
  - [string] `blockchain` (optional)
  - [string] `symbol` (optional)
  - [string] `assetId` (optional)
  - [string] `min` (optional), minimum input amount in base token units
  - [string] `max` (optional), maximum input amount in base token units

Constraint 1: values from above properties isn't static and is taken from https://1click.chaindefuser.com/v0/tokens, `*` can be used for any.

Constraint 2: all the properties are optional, but at least one of the following needs to be defined: `blockchain`, `symbol`, `assetId`.

```
{
  // schema version, starts with 1.0.0
  "version": "1.0.0",

  // support only bps property
  "default_fee": {
    "type": "bps",
    "bps": 20
  },

  // different examples of the rules
  "rules": [

    // reduced fees for USDC across all blockchains
    {
      "id": "usdc-swaps-half-fee",
      "enabled": true, // whether the rule is enabled
      "priority": 100, // optional explicit priority, defaults to 100
      "description": "Reduced fees for USDC swaps", // optional human-readable description

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

    // different fees for USDC on eth against WBTC on eth
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
