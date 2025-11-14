import { FeeContext, FeeRuleResult } from './fee-context.interface';

/**
 * Fee Rule Interface
 *
 * Each fee rule must implement this interface.
 * The apply method receives the context and returns the calculated fee.
 */
export interface IFeeRule {
  /**
   * Apply this fee rule to the given context
   * @param context The fee calculation context
   * @returns The calculated fee result
   */
  apply(context: FeeContext): FeeRuleResult;
}
