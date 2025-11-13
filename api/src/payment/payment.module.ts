import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MerchantController } from './controllers/merchant.controller';
import { PaymentService } from './services/payment.service';
import { PaymentLink, PaymentLinkSchema } from './schemas/payment-link.schema';
import { CoreServicesModule } from '../core-services/core-services.module';

@Module({
  imports: [
    ConfigModule,
    CoreServicesModule,
    MongooseModule.forFeature([
      { name: PaymentLink.name, schema: PaymentLinkSchema },
    ]),
  ],
  controllers: [MerchantController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
