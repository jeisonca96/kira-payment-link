import { Injectable } from '@nestjs/common';
import { IFeeRule } from '../fee-rule.interface';
import { FeeContext, FeeRuleResult } from '../fee-context.interface';

/**
 * Fixed Fee Rule
 *
 * Applies a fixed amount fee (e.g., $0.30 processing fee)
 */
@Injectable()
export class FixedFeeRule implements IFeeRule {
  apply(context: FeeContext): FeeRuleResult {
    const config = context.ruleConfig;

    if (!config?.amountInCents) {
      throw new Error('Fixed fee rule requires amountInCents in config');
    }

    let amount = config.amountInCents;
    const description = config.description || 'Processing Fee';

    if (context.isEligibleForDiscount) {
      amount = 0;
    }

    return {
      amount,
      description,
    };
  }
}
