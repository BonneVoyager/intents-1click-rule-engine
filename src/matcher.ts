import type { Rule, FeeConfig, TokenInfo, TokenMatcher, MatchResult, SwapRequest, TokenRegistry } from "./types";

export class RuleMatcher {
  private rules: Rule[];
  private defaultFee: FeeConfig["default_fee"];
  private tokenRegistry: TokenRegistry;

  constructor(config: FeeConfig, tokenRegistry: TokenRegistry) {
    this.defaultFee = config.default_fee;
    this.rules = this.sortRulesByPriority(config.rules);
    this.tokenRegistry = tokenRegistry;
  }

  private sortRulesByPriority(rules: Rule[]): Rule[] {
    return [...rules].sort((a, b) => {
      const priorityA = a.priority ?? 100;
      const priorityB = b.priority ?? 100;
      return priorityB - priorityA;
    });
  }

  private matchesToken(matcher: TokenMatcher, token: TokenInfo): boolean {
    if (matcher.assetId && matcher.assetId !== "*" && matcher.assetId !== token.assetId) {
      return false;
    }
    if (matcher.blockchain && matcher.blockchain !== "*" && matcher.blockchain !== token.blockchain) {
      return false;
    }
    if (matcher.symbol && matcher.symbol !== "*" && matcher.symbol !== token.symbol) {
      return false;
    }
    return true;
  }

  match(request: SwapRequest): MatchResult {
    const originToken = this.tokenRegistry.getToken(request.originAsset);
    const destinationToken = this.tokenRegistry.getToken(request.destinationAsset);

    if (!originToken || !destinationToken) {
      return {
        matched: false,
        fee: this.defaultFee,
      };
    }

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      const inMatches = this.matchesToken(rule.match.in, originToken);
      const outMatches = this.matchesToken(rule.match.out, destinationToken);

      if (inMatches && outMatches) {
        return {
          matched: true,
          rule,
          fee: rule.fee,
          matchDetails: { originToken, destinationToken },
        };
      }
    }

    return {
      matched: false,
      fee: this.defaultFee,
      matchDetails: { originToken, destinationToken },
    };
  }
}
