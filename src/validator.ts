import type { FeeConfig, Fee, Rule, TokenMatcher } from "./types";

export interface ValidationError {
  path: string;
  message: string;
}

const NEAR_ACCOUNT_REGEX = /^(?:[a-z\d]+[-_])*[a-z\d]+(?:\.[a-z\d]+[-_]*[a-z\d]+)*$/;
const NEAR_IMPLICIT_ACCOUNT_REGEX = /^[a-f0-9]{64}$/;

function isValidNearAccount(account: string): boolean {
  if (account.length < 2 || account.length > 64) return false;
  return NEAR_ACCOUNT_REGEX.test(account) || NEAR_IMPLICIT_ACCOUNT_REGEX.test(account);
}

function validateSingleFee(fee: Fee, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (fee.type !== "bps") {
    errors.push({ path: `${path}.type`, message: "fee.type must be 'bps'" });
  }
  if (typeof fee.bps !== "number" || fee.bps < 0) {
    errors.push({ path: `${path}.bps`, message: "fee.bps must be a non-negative number" });
  }
  if (!fee.recipient || typeof fee.recipient !== "string") {
    errors.push({ path: `${path}.recipient`, message: "fee.recipient is required and must be a string" });
  } else if (!isValidNearAccount(fee.recipient)) {
    errors.push({ path: `${path}.recipient`, message: "fee.recipient must be a valid NEAR account" });
  }

  return errors;
}

function validateFee(fee: Fee | Fee[], path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (Array.isArray(fee)) {
    if (fee.length === 0) {
      errors.push({ path, message: "fee array must not be empty" });
      return errors;
    }
    for (let i = 0; i < fee.length; i++) {
      errors.push(...validateSingleFee(fee[i]!, `${path}[${i}]`));
    }
  } else if (fee && typeof fee === "object") {
    errors.push(...validateSingleFee(fee, path));
  } else {
    errors.push({ path, message: "fee is required" });
  }

  return errors;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

function validateTokenMatcher(matcher: TokenMatcher, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  const hasIdentifier = matcher.blockchain || matcher.symbol || matcher.assetId;
  if (!hasIdentifier) {
    errors.push({
      path,
      message: "At least one of blockchain, symbol, or assetId must be defined",
    });
  }

  return errors;
}

function validateRule(rule: Rule, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const path = `rules[${index}]`;

  if (!rule.id || typeof rule.id !== "string") {
    errors.push({ path: `${path}.id`, message: "id is required and must be a string" });
  }

  if (typeof rule.enabled !== "boolean") {
    errors.push({ path: `${path}.enabled`, message: "enabled is required and must be a boolean" });
  }

  if (rule.priority !== undefined && (typeof rule.priority !== "number" || rule.priority < 0)) {
    errors.push({ path: `${path}.priority`, message: "priority must be a non-negative number" });
  }

  if (!rule.match) {
    errors.push({ path: `${path}.match`, message: "match is required" });
  } else {
    if (!rule.match.in) {
      errors.push({ path: `${path}.match.in`, message: "match.in is required" });
    } else {
      errors.push(...validateTokenMatcher(rule.match.in, `${path}.match.in`));
    }

    if (!rule.match.out) {
      errors.push({ path: `${path}.match.out`, message: "match.out is required" });
    } else {
      errors.push(...validateTokenMatcher(rule.match.out, `${path}.match.out`));
    }
  }

  if (!rule.fee) {
    errors.push({ path: `${path}.fee`, message: "fee is required" });
  } else {
    errors.push(...validateFee(rule.fee, `${path}.fee`));
  }

  return errors;
}

export function validateConfig(config: FeeConfig): ValidationResult {
  const errors: ValidationError[] = [];

  if (!config.version || typeof config.version !== "string") {
    errors.push({ path: "version", message: "version is required and must be a string" });
  }

  if (!config.default_fee) {
    errors.push({ path: "default_fee", message: "default_fee is required" });
  } else {
    errors.push(...validateFee(config.default_fee, "default_fee"));
  }

  if (!Array.isArray(config.rules)) {
    errors.push({ path: "rules", message: "rules must be an array" });
  } else {
    const ruleIds = new Set<string>();
    for (let i = 0; i < config.rules.length; i++) {
      const rule = config.rules[i]!;
      errors.push(...validateRule(rule, i));

      if (rule.id) {
        if (ruleIds.has(rule.id)) {
          errors.push({ path: `rules[${i}].id`, message: `Duplicate rule id: ${rule.id}` });
        }
        ruleIds.add(rule.id);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
