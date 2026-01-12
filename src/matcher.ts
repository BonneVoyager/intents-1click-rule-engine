import type { Rule, FeeConfig, TokenInfo, TokenMatcher, TokenMatchInfo, MatchResult, SwapRequest, TokenRegistry } from "./types";

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

  private matchesSinglePattern(pattern: string, value: string): boolean {
    if (pattern === "*") return true;
    if (pattern.startsWith("!")) {
      return value !== pattern.slice(1);
    }
    return pattern === value;
  }

  private matchesValue(pattern: string | string[], value: string): boolean {
    if (Array.isArray(pattern)) {
      return pattern.some((p) => this.matchesSinglePattern(p, value));
    }
    return this.matchesSinglePattern(pattern, value);
  }

  private matchesToken(matcher: TokenMatcher, token: TokenInfo): TokenMatchInfo | null {
    const matchedBy: TokenMatchInfo["matchedBy"] = {};

    if (matcher.assetId) {
      if (!this.matchesSinglePattern(matcher.assetId, token.assetId)) {
        return null;
      }
      matchedBy.assetId = true;
    }
    if (matcher.blockchain) {
      if (!this.matchesValue(matcher.blockchain, token.blockchain)) {
        return null;
      }
      matchedBy.blockchain = true;
    }
    if (matcher.symbol) {
      if (!this.matchesValue(matcher.symbol, token.symbol)) {
        return null;
      }
      matchedBy.symbol = true;
    }

    return { token, matchedBy };
  }

  private isRuleValidNow(rule: Rule): boolean {
    const now = Date.now();
    if (rule.valid_from) {
      const from = new Date(rule.valid_from).getTime();
      if (now < from) return false;
    }
    if (rule.valid_until) {
      const until = new Date(rule.valid_until).getTime();
      if (now > until) return false;
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
      if (!this.isRuleValidNow(rule)) continue;

      const inMatchInfo = this.matchesToken(rule.match.in, originToken);
      const outMatchInfo = this.matchesToken(rule.match.out, destinationToken);

      if (inMatchInfo && outMatchInfo) {
        return {
          matched: true,
          rule,
          fee: rule.fee,
          matchDetails: {
            originToken,
            destinationToken,
            in: inMatchInfo,
            out: outMatchInfo,
          },
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
