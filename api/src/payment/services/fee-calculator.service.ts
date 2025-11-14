import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FxRateService } from './fx-rate.service';
import { FeeProfileService } from './fee-profile.service';
import { TransactionService } from './transaction.service';
import { FixedFeeRule } from './fee-engine/rules/fixed-fee.rule';
import { PercentageFeeRule } from './fee-engine/rules/percentage-fee.rule';
import { CustomLoggerService } from '../../core-services/logger/custom-logger.service';
import { FeeType, FeesDetail } from '../dtos/quote-response.dto';
import { FeeContext } from './fee-engine/fee-context.interface';
import { IFeeRule } from './fee-engine/fee-rule.interface';
import { FeeRuleType } from '../schemas/fee-profile.schema';

export interface FeeCalculationResult {
  baseAmount: number;
  totalAmount: number;
  destinationAmountMxn: number;
  fxRate: number;
  fees: FeesDetail;
}

@Injectable()
export class FeeCalculatorService {
  private readonly logger: Logger;
  private readonly rules: Map<FeeRuleType, IFeeRule>;

  constructor(
    private readonly fxRateService: FxRateService,
    private readonly feeProfileService: FeeProfileService,
    private readonly transactionService: TransactionService,
    private readonly fixedFeeRule: FixedFeeRule,
    private readonly percentageFeeRule: PercentageFeeRule,
    private readonly customLoggerService: CustomLoggerService,
  ) {
    this.logger = this.customLoggerService.createLogger(
      FeeCalculatorService.name,
    );

    this.rules = new Map<FeeRuleType, IFeeRule>();
    this.rules.set(FeeRuleType.FIXED_FEE, this.fixedFeeRule);
    this.rules.set(FeeRuleType.PERCENTAGE_FEE, this.percentageFeeRule);
  }

  async calculateFees(
    baseAmountInCents: number,
    customerEmail?: string,
    profileId?: string,
  ): Promise<FeeCalculationResult> {
    this.logger.debug(
      `Calculating fees for amount: ${baseAmountInCents} cents${customerEmail ? `, customer: ${customerEmail}` : ''}`,
    );

    const { feeProfile, txCount, fxRate } = await this.fetchCalculationData(
      customerEmail,
      profileId,
    );

    const context = this.buildFeeContext(
      baseAmountInCents,
      txCount,
      fxRate,
      customerEmail,
      feeProfile,
    );

    this.executeFeeRulePipeline(feeProfile.rules, context);

    return this.buildCalculationResult(context, fxRate);
  }

  private async fetchCalculationData(
    customerEmail?: string,
    profileId?: string,
  ) {
    const [feeProfile, txCount, fxRate] = await Promise.all([
      this.feeProfileService.getFeeProfile(profileId),
      customerEmail
        ? this.transactionService.countCompletedTransactionsByEmail(
            customerEmail,
          )
        : Promise.resolve(0),
      this.fxRateService.getUsdToMxnRate(),
    ]);

    return { feeProfile, txCount, fxRate };
  }

  private buildFeeContext(
    baseAmountInCents: number,
    txCount: number,
    fxRate: number,
    customerEmail?: string,
    feeProfile?: any,
  ): FeeContext {
    const isEligibleForDiscount = this.feeProfileService.isEligibleForIncentive(
      feeProfile,
      txCount,
    );

    const context: FeeContext = {
      baseAmount: baseAmountInCents,
      txCount,
      customerEmail,
      fxRate,
      currentTotalFees: 0,
      breakdown: [],
      isFirstTransaction: txCount === 0,
      isEligibleForDiscount,
    };

    this.logger.debug(
      `Context initialized: txCount=${txCount}, eligible=${isEligibleForDiscount}, fxRate=${fxRate}`,
    );

    return context;
  }

  private executeFeeRulePipeline(rules: any[], context: FeeContext): void {
    for (const rule of rules) {
      context.ruleConfig = rule.config;

      const feeRule = this.rules.get(rule.type);

      if (!feeRule) {
        this.logger.warn(`Unknown rule type: ${rule.type}, skipping`);
        continue;
      }

      const result = feeRule.apply(context);

      context.breakdown.push({
        type: this.mapFeeRuleTypeToFeeType(rule.type),
        amount: result.amount,
        description: result.description,
      });

      context.currentTotalFees += result.amount;

      this.logger.debug(
        `Applied ${rule.type}: amount=${result.amount}, total=${context.currentTotalFees}`,
      );
    }
  }

  private buildCalculationResult(
    context: FeeContext,
    fxRate: number,
  ): FeeCalculationResult {
    const totalAmount = context.baseAmount + context.currentTotalFees;
    const destinationAmountMxn = Math.round(context.baseAmount * fxRate);

    const result: FeeCalculationResult = {
      baseAmount: context.baseAmount,
      totalAmount,
      destinationAmountMxn,
      fxRate,
      fees: {
        totalFees: context.currentTotalFees,
        breakdown: context.breakdown,
      },
    };

    this.logger.log(
      `Fee calculation complete: base=${context.baseAmount}, total=${totalAmount}, fees=${context.currentTotalFees}, fxRate=${fxRate}${context.isEligibleForDiscount ? ' [DISCOUNT APPLIED]' : ''}`,
    );

    return result;
  }

  private mapFeeRuleTypeToFeeType(ruleType: string): FeeType {
    switch (ruleType) {
      case 'FIXED_FEE':
        return FeeType.FIXED_FEE;
      case 'PERCENTAGE_FEE':
        return FeeType.PERCENTAGE_FEE;
      default:
        return FeeType.FIXED_FEE;
    }
  }
}
