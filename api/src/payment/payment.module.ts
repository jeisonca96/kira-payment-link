import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MerchantController } from './controllers/merchant.controller';
import { CheckoutController } from './controllers/checkout.controller';
import { PaymentService } from './services/payment.service';
import { FeeCalculatorService } from './services/fee-calculator.service';
import { FxRateService } from './services/fx-rate.service';
import { CacheService } from './services/cache.service';
import { FeeProfileService } from './services/fee-profile.service';
import { TransactionService } from './services/transaction.service';
import { PaymentLink, PaymentLinkSchema } from './schemas/payment-link.schema';
import { FeeProfile, FeeProfileSchema } from './schemas/fee-profile.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { CoreServicesModule } from '../core-services/core-services.module';
import { FixedFeeRule } from './services/fee-engine/rules/fixed-fee.rule';
import { PercentageFeeRule } from './services/fee-engine/rules/percentage-fee.rule';

@Module({
  imports: [
    ConfigModule,
    CoreServicesModule,
    MongooseModule.forFeature([
      { name: PaymentLink.name, schema: PaymentLinkSchema },
      { name: FeeProfile.name, schema: FeeProfileSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  controllers: [MerchantController, CheckoutController],
  providers: [
    PaymentService,
    FeeCalculatorService,
    FxRateService,
    CacheService,
    FeeProfileService,
    TransactionService,
    FixedFeeRule,
    PercentageFeeRule,
  ],
  exports: [PaymentService, FeeCalculatorService],
})
export class PaymentModule {}
