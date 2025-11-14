import { FeeBreakdownItem } from '../../dtos/quote-response.dto';
import { FeeRuleConfig } from '../../schemas/fee-profile.schema';

/**
 * Fee Context
 *
 * Contains all the information needed to calculate fees.
 * This object is passed through the fee calculation pipeline.
 */
export interface FeeContext {
  // Input data
  baseAmount: number;
  txCount: number;
  customerEmail?: string;
  fxRate: number;

  // Configuration for current rule
  ruleConfig?: FeeRuleConfig;

  // Accumulated results
  currentTotalFees: number;
  breakdown: FeeBreakdownItem[];

  // Incentive flags
  isFirstTransaction: boolean;
  isEligibleForDiscount: boolean;
}

/**
 * Fee Calculation Result from a single rule
 */
export interface FeeRuleResult {
  amount: number;
  description: string;
}
