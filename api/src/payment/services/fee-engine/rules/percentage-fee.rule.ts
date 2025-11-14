import { Injectable } from '@nestjs/common';
import { IFeeRule } from '../fee-rule.interface';
import { FeeContext, FeeRuleResult } from '../fee-context.interface';

/**
 * Percentage Fee Rule
 *
 * Applies a percentage-based fee over the base amount.
 * Examples: Card network fee (2.9%), FX conversion fee (1.5%)
 */
@Injectable()
export class PercentageFeeRule implements IFeeRule {
  apply(context: FeeContext): FeeRuleResult {
    const config = context.ruleConfig;

    if (config?.rate === undefined) {
      throw new Error('Percentage fee rule requires rate in config');
    }

    let amount = Math.round(context.baseAmount * config.rate);
    const description = config.description || 'Percentage Fee';

    if (context.isEligibleForDiscount) {
      amount = 0;
    }

    return {
      amount,
      description,
    };
  }
}
