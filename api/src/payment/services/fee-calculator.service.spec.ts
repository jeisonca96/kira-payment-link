import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FeeCalculatorService } from './fee-calculator.service';
import { FxRateService } from './fx-rate.service';
import { FeeProfileService } from './fee-profile.service';
import { TransactionService } from './transaction.service';
import { FixedFeeRule } from './fee-engine/rules/fixed-fee.rule';
import { PercentageFeeRule } from './fee-engine/rules/percentage-fee.rule';
import { CacheService } from './cache.service';
import { CustomLoggerService } from '../../core-services/logger/custom-logger.service';
import { FeeType } from '../dtos/quote-response.dto';
import { FeeRuleType, IncentiveType } from '../schemas/fee-profile.schema';

describe('FeeCalculatorService', () => {
  let service: FeeCalculatorService;
  let fxRateService: FxRateService;
  let feeProfileService: FeeProfileService;
  let transactionService: TransactionService;

  const mockFxRateService = {
    getUsdToMxnRate: jest.fn().mockResolvedValue(20.0),
  };

  const mockFeeProfileService = {
    getFeeProfile: jest.fn().mockResolvedValue({
      profileId: 'default',
      rules: [
        {
          type: FeeRuleType.FIXED_FEE,
          config: {
            amountInCents: 30,
            description: 'Processing Fee',
          },
        },
        {
          type: FeeRuleType.PERCENTAGE_FEE,
          config: {
            rate: 0.029,
            description: 'Card Network Fee',
          },
        },
        {
          type: FeeRuleType.PERCENTAGE_FEE,
          config: {
            rate: 0.015,
            description: 'FX Conversion',
          },
        },
      ],
      incentives: [
        {
          type: IncentiveType.FIRST_N_TRANSACTIONS,
          config: {
            n: 3,
            discountPercentage: 1.0,
          },
        },
      ],
    }),
    isEligibleForIncentive: jest.fn().mockReturnValue(false),
  };

  const mockTransactionService = {
    countCompletedTransactionsByEmail: jest.fn().mockResolvedValue(0),
  };

  const mockCustomLoggerService = {
    createLogger: jest.fn().mockReturnValue({
      debug: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeeCalculatorService,
        FixedFeeRule,
        PercentageFeeRule,
        {
          provide: FxRateService,
          useValue: mockFxRateService,
        },
        {
          provide: FeeProfileService,
          useValue: mockFeeProfileService,
        },
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: CustomLoggerService,
          useValue: mockCustomLoggerService,
        },
      ],
    }).compile();

    service = module.get<FeeCalculatorService>(FeeCalculatorService);
    fxRateService = module.get<FxRateService>(FxRateService);
    feeProfileService = module.get<FeeProfileService>(FeeProfileService);
    transactionService = module.get<TransactionService>(TransactionService);

    // Reset mocks before each test
    jest.clearAllMocks();
    mockFeeProfileService.isEligibleForIncentive.mockReturnValue(false);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateFees', () => {
    it('should calculate correct fees for $100.00 USD', async () => {
      const baseAmount = 10000; // $100.00
      const result = await service.calculateFees(baseAmount);

      expect(result.baseAmount).toBe(10000);
      expect(result.fxRate).toBe(20.0);

      // Verify fee breakdown
      const breakdown = result.fees.breakdown;
      expect(breakdown).toHaveLength(3);

      // Fixed fee: $0.30
      const fixedFee = breakdown.find((f) => f.type === FeeType.FIXED_FEE);
      expect(fixedFee).toBeDefined();
      expect(fixedFee?.amount).toBe(30);

      // Breakdown should have 3 fees: Fixed + 2 Percentage (Card Network + FX)
      expect(breakdown.length).toBe(3);

      // Percentage fees: 2.9% + 1.5% = 4.4% of $100 = $4.40
      const percentageFees = breakdown.filter(
        (f) => f.type === FeeType.PERCENTAGE_FEE,
      );
      expect(percentageFees.length).toBe(2);

      // First percentage (Card Network): 2.9% of $100 = $2.90
      expect(percentageFees[0]?.amount).toBe(290);

      // Second percentage (FX Conversion): 1.5% of $100 = $1.50
      expect(percentageFees[1]?.amount).toBe(150);

      // Total fees: $0.30 + $2.90 + $1.50 = $4.70
      expect(result.fees.totalFees).toBe(470);

      // Total amount: $100.00 + $4.70 = $104.70
      expect(result.totalAmount).toBe(10470);

      // Destination: $100.00 * 20 = 2000 MXN
      expect(result.destinationAmountMxn).toBe(200000);
    });

    it('should calculate correct fees for $50.00 USD', async () => {
      const baseAmount = 5000; // $50.00
      const result = await service.calculateFees(baseAmount);

      // Fixed fee: $0.30
      const fixedFee = result.fees.breakdown.find(
        (f) => f.type === FeeType.FIXED_FEE,
      );
      expect(fixedFee?.amount).toBe(30);

      // Percentage fees: 2.9% + 1.5% of $50
      const percentageFees = result.fees.breakdown.filter(
        (f) => f.type === FeeType.PERCENTAGE_FEE,
      );
      expect(percentageFees.length).toBe(2);

      // First percentage (Card Network): 2.9% of $50 = $1.45
      expect(percentageFees[0]?.amount).toBe(145);

      // Second percentage (FX Conversion): 1.5% of $50 = $0.75
      expect(percentageFees[1]?.amount).toBe(75);

      // Total fees: $0.30 + $1.45 + $0.75 = $2.50
      expect(result.fees.totalFees).toBe(250);

      // Total amount: $50.00 + $2.50 = $52.50
      expect(result.totalAmount).toBe(5250);
    });

    it('should use FX rate from service', async () => {
      const baseAmount = 10000;
      await service.calculateFees(baseAmount);

      expect(fxRateService.getUsdToMxnRate).toHaveBeenCalled();
    });

    it('should handle customer email parameter', async () => {
      const baseAmount = 10000;
      const customerEmail = 'test@example.com';
      const result = await service.calculateFees(baseAmount, customerEmail);

      expect(result).toBeDefined();
      expect(result.baseAmount).toBe(baseAmount);
      expect(
        transactionService.countCompletedTransactionsByEmail,
      ).toHaveBeenCalledWith(customerEmail);
    });

    it('should apply "First 3 Free" incentive for new customers', async () => {
      const baseAmount = 10000;
      const customerEmail = 'newcustomer@example.com';

      // Mock: This is the first transaction (eligible for discount)
      mockFeeProfileService.isEligibleForIncentive.mockReturnValue(true);
      mockTransactionService.countCompletedTransactionsByEmail.mockResolvedValue(
        0,
      );

      const result = await service.calculateFees(baseAmount, customerEmail);

      // All fees should be 0 because of the incentive
      expect(result.fees.totalFees).toBe(0);
      expect(result.totalAmount).toBe(baseAmount); // Only base amount, no fees

      // Breakdown should still exist but with 0 amounts
      expect(result.fees.breakdown).toHaveLength(3);
      result.fees.breakdown.forEach((fee) => {
        expect(fee.amount).toBe(0);
      });
    });

    it('should not apply incentive after 3 transactions', async () => {
      const baseAmount = 10000;
      const customerEmail = 'returning@example.com';

      // Mock: Customer has already made 3 transactions
      mockFeeProfileService.isEligibleForIncentive.mockReturnValue(false);
      mockTransactionService.countCompletedTransactionsByEmail.mockResolvedValue(
        3,
      );

      const result = await service.calculateFees(baseAmount, customerEmail);

      // Fees should be charged normally
      expect(result.fees.totalFees).toBe(470); // $4.70
      expect(result.totalAmount).toBe(10470); // $104.70
    });
  });
});
